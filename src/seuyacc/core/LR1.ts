/* eslint-disable @typescript-eslint/member-delimiter-style */
/* eslint-disable @typescript-eslint/no-use-before-define */
/**
 * LR语法分析表
 * by Withod, z0gSh1u
 * 2020-05 @ https://github.com/Withod/seu-lex-yacc
 */

import { YaccParser } from './YaccParser'
import {
  LR1Producer,
  YaccParserProducer,
  SpSymbol,
  LR1DFA,
  LR1Item,
  LR1State,
  YaccParserOperator,
} from './Grammar'
import { assert, cookString, ASCII_MIN, ASCII_MAX } from '../../utils'

export type GrammarSymbol = {
  type: 'ascii' | 'token' | 'nonterminal' | 'sptoken'
  content: string
}

export class LR1Analyzer {
  private _symbols: GrammarSymbol[]
  private _operators: YaccParserOperator[]
  private _symbolRange: [number, number, number, number, number]
  private _producers: LR1Producer[]
  private _startSymbol!: number
  // private _firstMap: Map<number, number[]>

  constructor(yaccParser: YaccParser) {
    this._symbols = []
    // @ts-ignore
    this._symbolRange = []
    this._producers = []
    this._operators = yaccParser.operatorDecl
    // this._firstMap = new Map<number, number[]>() // expr->firstSymbol[]
    this._distributeId(yaccParser)
    this._convertProducer(yaccParser.producers)
  }

  /**
   * 为符号分配编号
   */
  private _distributeId(yaccParser: YaccParser) {
    // 处理方式参考《Flex与Bison》P165
    // 0~127 ASCII，文字符号编号
    // 128~X Token编号
    // X+1~Y 非终结符编号
    // Y+1~Y+3 特殊符号
    for (let i = 0; i < 128; i++)
      this._symbols.push({ type: 'ascii', content: String.fromCharCode(i) })
    // 标记一下ASCII中的不可打印字符
    for (let i = 0; i < ASCII_MIN; i++)
      this._symbols[i] = { type: 'ascii', content: '[UNPRINTABLE]' }
    this._symbols[ASCII_MAX + 1] = { type: 'ascii', content: '[UNPRINTABLE]' }
    this._symbolRange.push(0, 128)
    for (let token of yaccParser.tokenDecl) this._symbols.push({ type: 'token', content: token })
    this._symbolRange.push(this._symbols.length)
    for (let nonTerminal of yaccParser.nonTerminals)
      this._symbols.push({ type: 'nonterminal', content: nonTerminal })
    this._symbolRange.push(this._symbols.length)
    for (let spSymbol of Object.values(SpSymbol)) this._symbols.push(spSymbol)
    this._symbolRange.push(this._symbols.length)
    this._startSymbol = this._getSymbolId({ content: yaccParser.startSymbol })
    assert(this._startSymbol, 'LR1 startSymbol unset.')
  }

  /**
   * 获取编号后的符号的编号
   */
  private _getSymbolId(grammarSymbol: {
    type?: 'ascii' | 'token' | 'nonterminal' | 'sptoken'
    content: string
  }) {
    for (let i = 0; i < this._symbols.length; i++)
      if (
        (!grammarSymbol.type ? true : this._symbols[i].type === grammarSymbol.type) &&
        this._symbols[i].content === grammarSymbol.content
      )
        return i
    return -1
  }

  /**
   * 根据编号获得符号
   */
  private _getSymbolById(id: number) {
    return this._symbols[id]
  }

  getSymbolById(id: number) {
    return this._getSymbolById(id)
  }

  /**
   * 判断符号是否是某个类型
   */
  private _symbolTypeIs(id: number, type: 'ascii' | 'token' | 'nonterminal' | 'sptoken') {
    return this._symbols[id].type === type
  }

  /**
   * 求取FIRST集
   */
  private FIRST(symbols: number[]): number[] {
    if (!symbols.length) return [this._getSymbolId(SpSymbol.EPSILON)]
    let ret: number[] = []
    if (this._symbolTypeIs(symbols[0], 'nonterminal')) ret.push(symbols[0])
    else {
      // TODO: 在存在直接或间接左递归的情况下会进入死循环，需要解决办法
      this._producersOf(symbols[0]).forEach(producer => {
        this.FIRST(producer.rhs).forEach(symbol => {
          if (!ret.includes(symbol)) ret.push(symbol)
        })
      })
    }
    if (ret.includes(this._getSymbolId(SpSymbol.EPSILON))) {
      this.FIRST(symbols.slice(1)).forEach(symbol => {
        if (!ret.includes(symbol)) ret.push(symbol)
      })
    }
    return ret
  }

  /**
   * 求取FOLLOW集
   */
  private FOLLOW(nonterminal: number): number[] {
    let ret: number[] = []
    let epsilon = this._getSymbolId(SpSymbol.EPSILON)
    if (nonterminal == this._startSymbol) ret.push(this._getSymbolId(SpSymbol.END))
    for (let producer of this._producers) {
      for (let i = 0; i < producer.rhs.length; i++) {
        if (producer.rhs[i] == nonterminal) {
          let first = this.FIRST(producer.rhs.slice(i + 1))
          first.forEach(symbol => {
            if (symbol != epsilon && !ret.includes(symbol)) ret.push(symbol)
          })
          if (first.includes(epsilon) && nonterminal != producer.lhs) {
            this.FOLLOW(producer.lhs).forEach(symbol => {
              if (!ret.includes(symbol)) ret.push(symbol)
            })
          }
        }
      }
    }
    return ret
  }

  /**
   * 获取指定非终结符为左侧的所有产生式
   */
  private _producersOf(nonterminal: number) {
    let ret = []
    for (let producer of this._producers) if (producer.lhs == nonterminal) ret.push(producer)
    return ret
  }

  /**
   * 将产生式转换为单条存储的、数字->数字[]形式
   */
  private _convertProducer(stringProducers: YaccParserProducer[]) {
    for (let stringProducer of stringProducers) {
      let lhs = this._getSymbolId({ type: 'nonterminal', content: stringProducer.lhs })
      assert(lhs != -1, 'lhs not found in symbols. This error should never occur.')
      for (let [index, right] of stringProducer.rhs.entries()) {
        let rhs = [],
          PATTERN = new RegExp(/(' '|[^ ]+)/g),
          char
        while ((char = PATTERN.exec(right))) {
          let tmp = char[0]
          if (/'.+'/.test(char[0])) {
            tmp = char[0].substring(1, char[0].length - 1)
            if (tmp[0] == '\\') tmp = cookString(tmp)
          }
          let id = this._getSymbolId({ content: tmp })
          rhs.push(id)
        }
        this._producers.push(new LR1Producer(lhs, rhs, stringProducer.actions[index]))
      }
    }
  }

  // /**
  //  * 求取所有现有符号的FIRST集作为基础
  //  */
  // private FIRSTAll() {
  //   for (let i = 0; i < this._symbolRange[4]; i++) this._firstMap.set(i, this.FIRST([i]))
  // }

  constructLR1DFA() {
    // 将C初始化为{CLOSURE}({|S'->.S,$|})
    let initProducer = this._producersOf(this._startSymbol)[0]
    let initItem = new LR1Item(initProducer, this._getSymbolId(SpSymbol.END))
    let I0 = new LR1State([initItem])
    I0 = this.CLOSURE(I0)
    let dfa = new LR1DFA(0)
    dfa.addState(I0)
    let stack = [0]
    while (stack.length) {
      console.log(stack.length)
      let stateToProcess = dfa.states[stack.pop() as number]
      let goto = this.GOTO(stateToProcess)
      for (let [key, val] of goto.entries()) {
        const stateIndex = dfa.states.findIndex(x => LR1State.sameState(x, val))
        if (stateIndex !== -1) {
          // 存在一致状态，直接连上边即可
          dfa.link(dfa.states.indexOf(stateToProcess), stateIndex, key)
        } else {
          let newState = new LR1State(val.items)
          dfa.addState(newState)
          dfa.link(dfa.states.indexOf(stateToProcess), dfa.states.length - 1, key)
          stack.push(dfa.states.length - 1)
        }
      }
    }
    return dfa
  }

  /**
   * 求取GOTO(I, X)
   * 做了一些改进，变成GOTO(I)(X)
   * 见龙书算法4.53
   */
  private GOTO(state: LR1State) {
    let res = new Map<number, LR1State>() // alpha, state
    for (let item of state.items) {
      if (item.dotAtLast()) continue
      let alpha = item.producer.rhs[item.dotPosition]
      let newItem = LR1Item.copy(item, true)
      if (res.has(alpha)) {
        res.get(alpha)?.addItem(newItem)
      } else {
        res.set(alpha, new LR1State([newItem]))
      }
    }
    return res
  }

  /**
   * 求取CLOSURE(I)
   * 见龙书算法4.53
   */
  private CLOSURE(state: LR1State) {
    let res = LR1State.copy(state)
    let allItemsOfI = [...state.items] // for I中的每一个项
    while (allItemsOfI.length) {
      let oneItemOfI = allItemsOfI.pop() as LR1Item
      if (oneItemOfI.dotAtLast()) continue // 点号到最后，不能扩展
      let currentSymbol = oneItemOfI.producer.rhs[oneItemOfI.dotPosition]
      if (!this._symbolTypeIs(currentSymbol, 'nonterminal')) continue // 非终结符打头才有CLOSURE
      let extendProducers = []
      for (let producerInG of this._producers) // for G'中的每个产生式
        producerInG.lhs === currentSymbol && extendProducers.push(producerInG) // 左手边是当前符号的，就可以作为扩展用
      let lookahead = oneItemOfI.lookahead
      for (let extendProducer of extendProducers) {
        let newLookaheads = this.FIRST(oneItemOfI.producer.rhs.slice(oneItemOfI.dotPosition))
        if (newLookaheads.includes(this._getSymbolId(SpSymbol.EPSILON))) {
          // 存在epsilon作为FIRST符
          newLookaheads = newLookaheads.filter(v => v != this._getSymbolId(SpSymbol.EPSILON))
          newLookaheads.push(lookahead)
        }
        for (let lookahead of newLookaheads) {
          // for FIRST(βa)中的每个终结符号b
          let newItem = new LR1Item(extendProducer, lookahead)
          if (state.items.some(item => LR1Item.sameItem(item, newItem))) continue // 重复的情况不再添加
          allItemsOfI.push(newItem) // 继续扩展
          res.addItem(newItem)
        }
      }
    }
    return res
  }
}
