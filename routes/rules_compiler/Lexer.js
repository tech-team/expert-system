"use strict";
var _ = require('lodash');
var S = require('string');
S.extendPrototype();

class Lexer {
    /**
     * Lexical analyzer / tokenizer
     * @param stringStream {StringStream} data source
     * @param onError {Function} callback
     */
    constructor(stringStream, onError) {
        this.TYPE = {
            NUMBER: Symbol("NUMBER"),
            IDENTIFIER: Symbol("IDENTIFIER"),
            IF: Symbol("IF"),
            THEN: Symbol("THEN"),

            EQUAL: Symbol("EQUAL"),
            LESS: Symbol("LESS"),
            MORE: Symbol("MORE"),
            NOT_EQUAL: Symbol("NOT_EQUAL"),

            ASSIGN: Symbol("ASSIGN"),

            AND: Symbol("AND"),

            EOF: Symbol("EOF")
        };

        this.KEY_WORDS = [
            {
                values: ["if", "если", "коли", "ежели"],
                type: this.TYPE.IF
            },
            {
                values: ["then", "то", "следовательно"],
                type: this.TYPE.THEN
            },
            {
                values: ["and", "и"],
                type: this.TYPE.AND
            }
        ];

        this.CHAR_CLASS = {
            ALPHA: {
                type: Symbol('ALPHA'),
                domain: /[a-zа-я_]/},
            NUMBER: {
                type: Symbol('NUMBER'),
                domain: /\d|\./},
            OPERATION: {
                type: Symbol('OPERATION'),
                domain: /=|>|<|!/},
            UNARY: {
                type: Symbol('UNARY'),
                domain: /-/},
            NULL: {
                type: Symbol('NULL'),
                domain: null},
            SPACE: {
                type: Symbol('SPACE'),
                domain: /\s/}
        };


        this.OPERATIONS = [
            {
                values: ["==", "equals", "equal", "равно", "равен", "является"],
                type: this.TYPE.EQUAL
            },
            {
                values: ["<", "less", "меньше"],
                type: this.TYPE.LESS
            },
            {
                values: [">", "more", "больше"],
                type: this.TYPE.MORE
            },
            {
                values: ["!=", "not_equal", "не_равно", "не_равен"],
                type: this.TYPE.NOT_EQUAL
            },
            {
                values: ["=", "set", "assign", "присвоить", "будет"],
                type: this.TYPE.ASSIGN
            }
        ];

        this.STATE = {
            NONE: Symbol("NONE"),
            OPERATION: Symbol("OPERATION"),
            NUMBER: Symbol("NUMBER"),
            ALPHA: Symbol("ALPHA"),
            ALPHANUMERIC: Symbol("ALPHANUMERIC"),
            ERROR: Symbol("ERROR"),
            END: Symbol("END")
        };

        this.stringStream = stringStream;
        this.onError = onError;
    }



    getNextToken() {
        var token = {
            type: null,
            value: ""
        };

        var state = this.STATE.NONE;

        var ch = this.stringStream.poll();
        while (state != this.STATE.END) {
            ch = this.stringStream.poll();

            let charClass = this.getCharClass(ch);
            if (!charClass) {
                this.onError("Unknown character: " + ch);
                return null;
            }

            let nextState = this.getNextState(token, state, charClass);

            //console.log("State: ", state.toString());
            //console.log("Char: ", ch);
            //console.log("Char class: ", charClass.type.toString());
            //console.log("Next state: ", nextState.toString());
            //console.log();

            state = nextState;

            if (state == this.STATE.ERROR) {
                this.onError("Unrecognized token:" + token.value);
                return null;
            }

            if (state != this.STATE.END) {
                token.value += ch;
                ch = this.stringStream.next();
            } else {
                // do not move stream unless ch is space
                if (this.CHAR_CLASS.SPACE.domain.test(ch))
                    this.stringStream.next();

                token.type = this.deduceTokenType(token);

                //console.log("Token parsed: ", token);
                return token;
            }
        }
    }

    getCharClass(ch) {
        if (ch == null)
            return this.CHAR_CLASS.NULL;

        ch = ch.toLowerCase();

        var charClass = _.find(this.CHAR_CLASS, function (classObject) {
            if (classObject.domain && classObject.domain.test(ch))
                return true;
        });

        return charClass;
    }

    getNextState(token, currentState, charClass) {
        switch (currentState) {
            case this.STATE.NONE:
                switch (charClass) {
                    case this.CHAR_CLASS.ALPHA:
                        return this.STATE.ALPHA;
                    case this.CHAR_CLASS.NUMBER:
                        return this.STATE.NUMBER;
                    case this.CHAR_CLASS.OPERATION:
                        return this.STATE.OPERATION;
                    case this.CHAR_CLASS.UNARY:
                        return this.STATE.NUMBER;
                    case this.CHAR_CLASS.NULL:
                        return this.STATE.END;
                    case this.CHAR_CLASS.SPACE:
                        return this.STATE.NONE;
                    default:
                        return this.STATE.ERROR;
                }
                break;

            case this.STATE.ALPHA:
                switch (charClass) {
                    case this.CHAR_CLASS.ALPHA:
                        return this.STATE.ALPHA;
                    case this.CHAR_CLASS.NUMBER:
                        return this.STATE.NUMBER;
                    case this.CHAR_CLASS.OPERATION:
                        return this.STATE.END;
                    case this.CHAR_CLASS.UNARY:
                        return this.STATE.ERROR;
                    case this.CHAR_CLASS.NULL:
                        return this.STATE.END;
                    case this.CHAR_CLASS.SPACE:
                        return this.STATE.END;
                    default:
                        return this.STATE.ERROR;
                }
                break;

            case this.STATE.NUMBER:
                switch (charClass) {
                    case this.CHAR_CLASS.ALPHA:
                        return this.STATE.ERROR;
                    case this.CHAR_CLASS.NUMBER:
                        return this.STATE.NUMBER;
                    case this.CHAR_CLASS.OPERATION:
                        return this.STATE.END;
                    case this.CHAR_CLASS.UNARY:
                        return this.STATE.ERROR;
                    case this.CHAR_CLASS.NULL:
                        return this.STATE.END;
                    case this.CHAR_CLASS.SPACE:
                        return this.STATE.END;
                    default:
                        return this.STATE.ERROR;
                }
                break;

            case this.STATE.ALPHANUMERIC:
                switch (charClass) {
                    case this.CHAR_CLASS.ALPHA:
                        return this.STATE.ALPHANUMERIC;
                    case this.CHAR_CLASS.NUMBER:
                        return this.STATE.ALPHANUMERIC;
                    case this.CHAR_CLASS.OPERATION:
                        return this.STATE.END;
                    case this.CHAR_CLASS.UNARY:
                        return this.STATE.ERROR;
                    case this.CHAR_CLASS.NULL:
                        return this.STATE.END;
                    case this.CHAR_CLASS.SPACE:
                        return this.STATE.END;
                    default:
                        return this.STATE.ERROR;
                }
                break;

            case this.STATE.OPERATION:
                switch (charClass) {
                    case this.CHAR_CLASS.ALPHA:
                        return this.STATE.END;
                    case this.CHAR_CLASS.NUMBER:
                        return this.STATE.END;
                    case this.CHAR_CLASS.OPERATION:
                        return this.STATE.OPERATION;
                    case this.CHAR_CLASS.UNARY:
                        return this.STATE.END;
                    case this.CHAR_CLASS.NULL:
                        return this.STATE.END;
                    case this.CHAR_CLASS.SPACE:
                        return this.STATE.END;
                    default:
                        return this.STATE.ERROR;
                }
                break;

            case this.STATE.ERROR:
                return this.STATE.ERROR;

            case this.STATE.END:
                return this.STATE.ERROR;
        }
    }

    deduceTokenType(token) {
        if (token.value == "")
            return this.TYPE.EOF;

        if (Lexer.isNumber(token.value)) {
            return this.TYPE.NUMBER;
        }

        var op = _.find(this.OPERATIONS, function (opObject) {
            var values = opObject.values;
            return _.contains(values, token.value);
        });
        if (op) {
            return op.type;
        }

        var keyWord = _.find(this.KEY_WORDS, function (kwObject) {
            var values = kwObject.values;
            return _.contains(values, token.value);
        });
        if (keyWord) {
            return keyWord.type;
        }

        return this.TYPE.IDENTIFIER;
    }

    static isNumber(value) {
        return /-?\d+(\.\d+)?/.test(value);
    }
}

module.exports = Lexer;