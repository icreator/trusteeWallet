/**
 * @version 0.5
 * https://github.com/trezor/blockbook/blob/master/docs/api.md
 * https://doge1.trezor.io/api/v2/address/D5oKvWEibVe74CXLASmhpkRpLoyjgZhm71?details=txs
 *
 * @typedef {Object} UnifiedTransaction
 * @property {*} transactionHash
 * @property {*} blockHash
 * @property {*} blockNumber
 * @property {*} blockTime
 * @property {*} blockConfirmations
 * @property {*} transactionDirection
 * @property {*} addressFrom
 * @property {*} addressTo
 * @property {*} addressAmount
 * @property {*} transactionStatus
 * @property {*} transactionFee
 * @property {*} transactionFeeCurrencyCode
 * @property {*} contractAddress
 * @property {*} inputValue
 * @property {*} transactionJson
 */
import BlocksoftUtils from '../../common/BlocksoftUtils'
import BlocksoftAxios from '../../common/BlocksoftAxios'
import BlocksoftCryptoLog from '../../common/BlocksoftCryptoLog'

import DogeFindAddressFunction from './basic/DogeFindAddressFunction'
import BlocksoftExternalSettings from '../../common/BlocksoftExternalSettings'

const CACHE_VALID_TIME = 30000 // 30 seconds
const CACHE = {}

let TREZOR_INDEX = 0

export default class DogeScannerProcessor {

    /**
     * @type {number}
     * @private
     */
    _blocksToConfirm = 5

    /**
     * @type {string}
     * @private
     */
    _trezorServerCode = 'DOGE_TREZOR_SERVER'

    /**
     * @private
     */
    _trezorServer = false

    constructor(settings) {
        this._settings = settings
    }

    /**
     * @param address
     * @returns {Promise<boolean|*>}
     * @private
     */
    async _get(address) {
        const now = new Date().getTime()
        if (typeof CACHE[address] !== 'undefined' && (now - CACHE[address].time < CACHE_VALID_TIME)) {
            CACHE[address].provider = 'trezor-cache'
            return CACHE[address]
        }
        if (!this._trezorServer) {
            this._trezorServer = await BlocksoftExternalSettings.get(this._trezorServerCode)
        }
        const link = this._trezorServer[TREZOR_INDEX] + '/api/v2/address/' + address + '?details=txs'
        const res = await BlocksoftAxios.getWithoutBraking(link)
        if (!res || !res.data) {
            TREZOR_INDEX++
            if (TREZOR_INDEX >= this._trezorServer.length) {
                TREZOR_INDEX = 0
            }
            return false
        }
        if (typeof res.data.balance === 'undefined') {
            throw new Error(this._settings.currencyCode + ' DogeScannerProcessor._get nothing loaded for address ' + link)
        }
        CACHE[address] = {
            data: res.data,
            time: now,
            provider : 'trezor'
        }
        return CACHE[address]
    }

    /**
     * @param {string} address
     * @return {Promise<{balance:*, unconfirmed:*, provider:string}>}
     */
    async getBalanceBlockchain(address) {
        BlocksoftCryptoLog.log(this._settings.currencyCode + ' DogeScannerProcessor.getBalance started', address)
        const res = await this._get(address)
        if (!res) {
            return false
        }
        return { balance: res.data.balance, unconfirmed: res.data.unconfirmedBalance, provider: res.provider, time : res.time }
    }

    /**
     * @param {string} address
     * @return {Promise<UnifiedTransaction[]>}
     */
    async getTransactionsBlockchain(address) {
        address = address.trim()
        BlocksoftCryptoLog.log(this._settings.currencyCode + ' DogeScannerProcessor.getTransactions started', address)
        let res = await this._get(address)
        if (!res || typeof res.data === 'undefined') return []
        BlocksoftCryptoLog.log(this._settings.currencyCode + ' DogeScannerProcessor.getTransactions loaded from ' + res.provider + ' ' + res.time)
        res = res.data
        if (typeof res.transactions === 'undefined' || !res.transactions) return []
        const transactions = []
        let tx
        for (tx of res.transactions) {
            const transaction = await this._unifyTransaction(address, tx)
            if (transaction) {
                transactions.push(transaction)
            }
        }
        BlocksoftCryptoLog.log(this._settings.currencyCode + ' DogeScannerProcessor.getTransactions finished', address)
        return transactions
    }

    /**
     *
     * @param {string} address
     * @param {Object} transaction
     * @param {string} transaction.txid c6b4c3879196857bed7fd5b553dd0049486c032d6a1be72b98fda967ca54b2da
     * @param {string} transaction.version 1
     * @param {string} transaction.vin[].txid aa31777a9db759f57fd243ef47419939f233d16bc3e535e9a1c5af3ace87cb54
     * @param {string} transaction.vin[].sequence 4294967294
     * @param {string} transaction.vin[].n 0
     * @param {string} transaction.vin[].addresses [ 'DFDn5QyHH9DiFBNFGMcyJT5uUpDvmBRDqH' ]
     * @param {string} transaction.vin[].value 44400000000
     * @param {string} transaction.vin[].hex 47304402200826f97d3432452abedd4346553de0b0c2d401ad7056b155e6462484afd98aa902202b5fb3166b96ded33249aecad7c667c0870c1
     * @param {string} transaction.vout[].value 59999824800
     * @param {string} transaction.vout[].n 0
     * @param {string} transaction.vout[].spent true
     * @param {string} transaction.vout[].hex 76a91456d49605503d4770cf1f32fbfb69676d9a72554f88ac
     * @param {string} transaction.vout[].addresses  [ 'DD4DKVTEkRUGs7qzN8b7q5LKmoE9mXsJk4' ]
     * @param {string} transaction.blockHash fc590834c04812e1c7818024a94021e12c4d8ab905724b4a4fdb4d4732878f69
     * @param {string} transaction.blockHeight 3036225
     * @param {string} transaction.confirmations 8568
     * @param {string} transaction.blockTime 1577362993
     * @param {string} transaction.value 59999917700
     * @param {string} transaction.valueIn 59999917700
     * @param {string} transaction.fees 0
     * @param {string} transaction.hex 010000000654cb87ce3aafc5a1e935e5c36bd133f239
     * @return  {Promise<UnifiedTransaction>}
     * @private
     */
    async _unifyTransaction(address, transaction) {
        let showAddresses = false
        try {
            showAddresses = await DogeFindAddressFunction([address], transaction)
        } catch (e) {
            e.message += ' transaction hash ' + JSON.stringify(transaction) + ' address ' + address
            throw e
        }

        let transactionStatus = 'new'
        if (transaction.confirmations > this._blocksToConfirm) {
            transactionStatus = 'success'
        } else if (transaction.confirmations > 0) {
            transactionStatus = 'confirming'
        }

        let formattedTime
        try {
            formattedTime = BlocksoftUtils.toDate(transaction.blockTime)
        } catch (e) {
            e.message += ' timestamp error transaction data ' + JSON.stringify(transaction)
            throw e
        }

        return {
            transactionHash: transaction.txid,
            blockHash: transaction.blockHash,
            blockNumber: +transaction.blockHeight,
            blockTime: formattedTime,
            blockConfirmations: transaction.confirmations,
            transactionDirection: showAddresses.direction,
            addressFrom: showAddresses.from,
            addressTo: showAddresses.to,
            addressAmount: showAddresses.value,
            transactionStatus: transactionStatus,
            transactionFee: transaction.fees
        }
    }
}