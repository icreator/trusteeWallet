/**
 * @version 0.9
 */
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Clipboard, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { TextField } from 'react-native-material-textfield'
import QR from 'react-native-vector-icons/FontAwesome'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Ionicons from 'react-native-vector-icons/Ionicons'

import GradientView from '../../components/elements/GradientView'

import { normalizeWithDecimals } from '../../services/utils'
import copyToClipboard from '../../services/UI/CopyToClipboard/CopyToClipboard'
import { capitalize } from '../../services/UI/Capitalize/Capitalize'
import { checkQRPermission } from '../../services/UI/Qr/QrPermissions'
import Validator from '../../services/UI/Validator/Validator'
import Toast from '../../services/UI/Toast/Toast'
import { strings } from '../../services/i18n'


class Input extends Component {

    constructor(props) {
        super(props)
        this.state = {
            value: '',
            errors: [],
            focus: false,
            autoFocus: false,
            show: false,
            tap: true
        }
        this.inputRef = React.createRef()
    }

    componentDidMount() {
        setTimeout(() => {
            this.setState({
                show: true
            })
        }, 200)

        setTimeout(() => {
            const { autoFocus } = this.props
            if (typeof autoFocus !== 'undefined') {
                this.setState({
                    autoFocus,
                    show: false
                }, () => {
                    this.setState({
                        show: true
                    })
                })
            }
        }, 500)
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(props) {
        const { qr, qrCodeScanner } = this.props
        if (qr && props.qrCodeScanner.value && props.qrCodeScanner.value !== qrCodeScanner.value) {
            this.setState({
                value: props.qrCodeScanner.value
            })
        }
    }

    handleForceUpdate = () => {
        this.forceUpdate()
    }

    getValue = () => this.state.value

    handleReadFromClipboard = async () => {
        const clipboardContent = await Clipboard.getString()
        this.setState({ value: clipboardContent }, () => {
            this.handleValidate()
        })

    }

    handleInput = async (value, useCallback) => {

        value === '' && !this.state.focus ? value = this.state.value : value

        const { id, name, type, subtype, cuttype, additional, decimals, callback } = this.props

        if (additional === 'NUMBER') {
            value = normalizeWithDecimals(value, typeof decimals !== 'undefined' ? decimals : 5)
            this.setState({
                value
            })
        } else {
            const validation = await Validator.arrayValidation([{ id, name, type, subtype, cuttype, value }])
            this.setState({
                value,
                errors: validation.errorArr
            })
        }

        if (typeof callback !== 'undefined' && useCallback !== false) {
            callback(value)
        }
    }

    handleCopyToClipboard = () => {
        copyToClipboard(this.state.value)

        Toast.setMessage(strings('toast.copied')).show()
    }

    handleValidate = async () => {
        const { id, name, type, subtype, cuttype } = this.props
        let { value } = this.state

        let validation
        if (cuttype) {
            let valueNew = value.trim().replace(/\n/g, " ")
            const tmpIndex = valueNew.lastIndexOf('[ Photo ]')
            if (tmpIndex !== -1) {
                valueNew = valueNew.slice(tmpIndex + 9).trim()
            }
            if (valueNew.indexOf(cuttype) === 0) {
                valueNew = valueNew.substr(cuttype.length).trim()
            }
            if (valueNew) {
                value = valueNew
            }
        }

        if (Array.isArray(type)) {

            let tmps = []
            let tmp
            for (tmp of type) {
                tmps.push(
                    {
                        id,
                        name,
                        type: tmp,
                        subtype,
                        cuttype,
                        value
                    }
                )
            }
            validation = await Validator.arrayValidation(tmps)

            if (validation.errorArr.length !== type.length) {
                validation = {
                    status: 'success',
                    errorArr: []
                }
            }
        } else {
            validation = await Validator.arrayValidation([{
                id,
                name,
                type,
                subtype,
                cuttype,
                value
            }])
        }

        this.setState({
            value,
            errors: validation.errorArr || validation.message
        })

        return {
            status: validation.status,
            value
        }
    }

    render() {

        const { value, show, focus, errors, autoFocus } = this.state
        const {
            id,
            name,
            mark,
            action,
            actionBtnStyles,
            paste,
            copy,
            qr,
            style,
            onFocus,
            subTitle,
            disabled,
            qrCallback,
            bottomLeftText,
            keyboardType,
            inputBaseColor,
            inputTextColor,
            markStyle,
            tapText,
            tapCallback,
            tapWrapperStyles,
            tapContentStyles,
            tapTextStyles,
            tapIconStyle = {},
            tintColor,
            validPlaceholder,
            onSubmitEditing,
            isCapitalize = true,
            isLine = true
        } = this.props
        const placeholder = isCapitalize ? capitalize(name) : name

        let error = errors.find(item => item.field === id)
        error = typeof error !== 'undefined' ? error.msg : ''
        const isDisabled = typeof disabled !== 'undefined' ? disabled : false

        return (
            <View style={{ ...styles.wrapper, ...style }}>
                {
                    typeof isLine !== 'undefined' && isLine ? <GradientView style={styles.line} array={error ? lineStyles_.arrayError : lineStyles_.array} start={lineStyles_.start} end={lineStyles_.end}/> : null
                }
                {
                    show ? <TextField
                        ref={ref => this.inputRef = ref}
                        keyboardType={typeof keyboardType !== 'undefined' ? keyboardType : 'default'}
                        tintColor={typeof tintColor !== 'undefined' ? tintColor : styles.tintColor}
                        errorColor={styles.errorColor}
                        labelHeight={styles.labelHeight}
                        baseColor={typeof inputBaseColor !== 'undefined' ? inputBaseColor : '#404040'}
                        textColor={typeof inputTextColor !== 'undefined' ? inputTextColor : '#0D0D0D'}
                        fontSize={19}
                        lineWidth={0}
                        activeLineWidth={0}
                        label={placeholder}
                        value={value}
                        //  returnKeyLabel={'Buy'}
                        // returnKeyType={'done'}
                        onSubmitEditing={typeof onSubmitEditing !== 'undefined' ? onSubmitEditing : () => {
                        }}
                        autoFocus={typeof autoFocus !== 'undefined' && !isDisabled ? autoFocus : false}
                        disabled={isDisabled}
                        error={error ? error.toString() : ''}
                        onChangeText={(value) => this.handleInput(value)}
                        style={styles.fontFamily}
                        onBlur={() => {
                            this.setState({ focus: false })
                        }}
                        onFocus={typeof onFocus === 'undefined' ? () => {
                            this.setState({ focus: true })
                        } : () => {
                            this.setState({ focus: true })
                            onFocus()
                        }}
                    /> : null
                }
                {
                    validPlaceholder ?
                        <TextInput
                            style={[styles.validPlaceholder, !this.state.errors.length && value !== '' && focus === false ? styles.validPlaceholder_active : null]}
                            value={value.slice(0, 8) + '...' + value.slice(value.length - 8, value.length)}
                            editable={!isDisabled}
                            onFocus={() => {
                                this.inputRef.focus()
                            }}
                        /> : null
                }
                {
                    typeof tapText !== 'undefined' ?
                        <TouchableOpacity disabled={typeof disabled !== 'undefined' ? disabled : false} style={[styles.tap, tapWrapperStyles]} onPress={() => {
                            tapCallback()
                            this.setState({ tap: !this.state.tap })
                        }}>
                            <View style={[styles.tap__content, typeof disabled !== 'undefined' && disabled ? styles.tap__content_disabled : null, tapContentStyles]}>
                                <View style={{
                                    height: 12, transform: [
                                        { rotateX: `${this.state.tap ? '0' : '180'}deg` }
                                    ]
                                }}>
                                    {typeof disabled !== 'undefined' && !disabled ? <Ionicons size={12} name='ios-swap' style={[{ color: '#7127ac', ...tapIconStyle }]}/> : null}
                                </View>
                                <Text style={[styles.tap__text, tapTextStyles]}>{tapText}</Text>
                            </View>
                        </TouchableOpacity> : null
                }
                <View style={styles.actions}>
                    {
                        typeof copy !== 'undefined' && copy ?
                            <TouchableOpacity onPress={this.handleCopyToClipboard} style={[styles.actionBtn]}>
                                <MaterialCommunityIcons style={styles.actionBtn__icon} name="content-copy" size={25} color="#855eab"/>
                            </TouchableOpacity> : null
                    }
                    {
                        typeof paste !== 'undefined' && paste ?
                            <TouchableOpacity onPress={this.handleReadFromClipboard} style={[styles.actionBtn]}>
                                <MaterialCommunityIcons style={styles.actionBtn__icon} name="content-paste" size={25} color="#855eab"/>
                            </TouchableOpacity> : null
                    }
                    {
                        typeof qr !== 'undefined' && qr ?
                            <TouchableOpacity onPress={() => checkQRPermission(qrCallback)} style={styles.actionBtn}>
                                <QR style={{ ...styles.actionBtn__icon_qr, ...styles.actionBtn__icon }} name="qrcode" size={25} color="#855eab"/>
                            </TouchableOpacity> : null
                    }
                </View>
                {
                    typeof action !== 'undefined' && !disabled ?
                        <TouchableOpacity onPress={action.callback} style={[styles.action, actionBtnStyles]}>
                            <View style={styles.action__title}>
                                <Text style={styles.action__title__text}>
                                    {action.title}
                                </Text>
                            </View>
                        </TouchableOpacity> : null
                }
                {
                    typeof subTitle !== 'undefined' ?
                        <Text style={styles.subTitle}>{subTitle}</Text> : null
                }
                <View style={styles.bottomTexts}>
                    <Text numberOfLines={1}>
                        <Text style={{ ...styles.mark, ...markStyle }}>
                            {typeof bottomLeftText !== 'undefined' ? bottomLeftText : ''}
                        </Text>
                        <Text style={{ ...styles.mark, ...markStyle }}>
                            {typeof mark !== 'undefined' ? mark : ''}
                        </Text>
                    </Text>
                </View>

            </View>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        qrCodeScanner: state.qrCodeScannerStore
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        dispatch
    }
}

export default connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(Input)

const lineStyles_ = {
    array: ['#7127ac', '#864dd9'],
    arrayError: ['#e77ca3', '#f0a5af'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 }
}

const styles = {
    wrapper: {
        flex: 1,
        position: 'relative',
        maxHeight: 70,
        minHeight: 70,
        marginBottom: 10
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    label: {
        fontSize: 30,
        fontFamily: 'SFUIDisplay-Regular'
    },
    input: {
        padding: 0,
        fontSize: 19
    },
    line: {
        position: 'absolute',
        top: 50,
        width: '100%',
        height: 2,
        borderRadius: 2
    },
    error: {
        marginTop: 5,
        fontSize: 14,
        fontFamily: 'SFUIDisplay-Regular',
        color: '#e77ca3'
    },
    fontFamily: {
        fontFamily: 'SFUIDisplay-Regular'
        // textDecoration: 'none'
    },
    mark: {
        //position: 'absolute',
        right: 0,
        bottom: 0,
        fontFamily: 'SFUIDisplay-Regular',
        fontSize: 12,
        color: '#808080'
    },
    action: {
        position: 'absolute',
        right: 0,
        top: -2
    },
    action__title: {
        marginTop: -5,
        height: 30,
        justifyContent: 'center'
    },
    action__title__text: {
        fontSize: 10,
        fontFamily: 'SFUIDisplay-Bold',
        color: '#864dd9'
    },
    actions: {
        position: 'absolute',
        top: -5,
        right: 0,
        flexDirection: 'row'
    },
    actionBtn: {},
    actionBtn__icon: {
        marginLeft: 20
    },
    actionBtn__icon_qr: {
        marginTop: 2
    },
    tintColor: '#7127ac',
    errorColor: '#e77ca3',
    labelHeight: 15,
    subTitle: {
        marginTop: -5,
        fontSize: 14,
        fontFamily: 'SFUIDisplay-Regular',
        color: '#808080'
    },
    bottomLeftText: {
        fontSize: 19
    },
    bottomTexts: {
        marginTop: -4,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'nowrap'
    },
    validPlaceholder: {
        position: 'absolute',
        top: 20,
        left: 0,

        width: '100%',
        maxHeight: 0,
        padding: 0,

        color: '#0D0D0D',
        fontSize: 19,
        fontFamily: 'SFUIDisplay-Regular',

        backgroundColor: '#f9f9f9',
        overflow: 'hidden'
    },
    validPlaceholder_active: {
        maxHeight: 200
    },
    tap: {
        position: 'absolute',
        right: 0,
        top: 20
    },
    tap__content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingVertical: 5,
        borderRadius: 5,
        backgroundColor: '#f2f2f2'
    },
    tap__text: {
        marginLeft: 4,

        fontSize: 12,
        fontFamily: 'SFUIDisplay-Regular',
        color: '#7127ac'
    },
    tap__content_disabled: {
        backgroundColor: '#f9f9f9'
    }
}
