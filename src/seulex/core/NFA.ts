import { FiniteAutomata, State } from './FA'

/**
 * 非确定有限状态自动机
 */
export class NFA extends FiniteAutomata {
  /**
   * 构造一个形如`->0 --a--> [1]`的NFA（两个状态，之间用初始字母连接）
   */
  constructor(initAlpha?: string) {
    super()
    this._startStates = initAlpha ? [new State()] : [] // 开始状态
    this._acceptStates = initAlpha ? [new State()] : [] // 接收状态
    this._states = [...this._startStates, ...this._acceptStates] // 全部状态
    this._alphabet = initAlpha ? [initAlpha] : [] // 字母表
    this._transformMatrix = initAlpha // 状态转移矩阵
      ? [[{ alpha: 0, target: 1 }]]
      : [[]] // TODO: or []?
  }

  /**
   * Kleene闭包
   */
  kleene() {
    return
  }

  /**
   * 尝试识别字符串
   * @param sentence 待识别字符串，请打散成char[]
   */
  test(sentence: string[]) {
    // 试验每一个开始状态
    for (let startState of this._startStates) {
      let currentState = startState, // 本轮深搜当前状态
        matchedWordCount = 0, // 符合的字符数
        maybeStates: State[] = [] // DFS辅助数组，记录历史状态
      while (matchedWordCount <= sentence.length) {
        if (
          // 目前匹配了全句
          matchedWordCount === sentence.length &&
          // 并且目前已经到达接收态
          this.hasReachedAcceptStates(currentState)
        ) {
          return true
        } else if (matchedWordCount === sentence.length) {
          // 全部匹配完成但是未到达接收态，说明应换一个开始状态再次试验
          break
        } else if (!this._alphabet.includes(sentence[matchedWordCount])) {
          // 字母表不存在该字符
          // 注意此时matchedWordCount一定小于sentence.length
          return false
        } else {
          // 剩余情况则向外推进，继续搜索
          let { result, notEpsilon } = this.expand(
            currentState,
            this._alphabet.indexOf(sentence[matchedWordCount])
          )
          // TODO: epsilon下是否增加matchedWordCount？
          if (notEpsilon) {
            matchedWordCount += 1
          }
          for (let newState of result) {
            !maybeStates.includes(newState) && maybeStates.push(newState)
          }
        }
        if (!maybeStates.length) {
          // 没有可选的进一步状态了
          break
        } else {
          // 选一个可选的进一步状态
          currentState = maybeStates.pop() as State
        }
      }
    }
    return false
  }

  /**
   * 返回从当前状态收到一个字母后能到达的所有其他状态（考虑了epsilon边）
   * @param state 当前状态
   * @param alpha 字母下标
   * @returns `{结果状态数组, 是否消耗字符}`
   */
  expand(state: State, alpha: number) {
    let transforms = this.getTransforms(state),
      result: State[] = [],
      notEpsilon = false
    for (let transfrom of transforms) {
      if (transfrom.alpha === alpha) {
        result.push(this._states[transfrom.target])
        notEpsilon = true
      } else if (transfrom.alpha === -1 /* epsilon */) {
        result.push(this._states[transfrom.target])
      }
    }
    return { result, notEpsilon }
  }

  /**
   * 检测当前是否到达接收状态（考虑了epsilon边）
   */
  hasReachedAcceptStates(currentState: State) {
    // 不考虑epsilon边
    if (this._acceptStates.indexOf(currentState) !== -1) {
      return true
    }
    // 考虑epsilon边，尝试向外扩展
    let stack = [currentState] // 深搜辅助栈
    while (!!stack.length) {
      for (let transform of this.getTransforms(stack.pop() as State, true)) {
        // 遍历所有epsilon转移
        let targetState = this._states[transform.target]
        // 如果到达接收状态就返回真
        if (this._acceptStates.includes(targetState)) return true
        // 否则放入栈等待进一步扩展
        else if (stack.indexOf(targetState)) stack.push(targetState)
      }
    }
    return false
  }

  /**
   * 串联两个NFA
   * `NFA1 --epsilon--> NFA2`
   */
  static concat(nfa1: NFA, nfa2: NFA) {
    let res = new NFA()
    res._startStates = nfa1._startStates
    res._acceptStates = nfa2._acceptStates
    res._alphabet = [...new Set([...nfa1._alphabet, ...nfa2._alphabet])]
    res._states = [...nfa1._states, ...nfa2._states]
    // TODO: 处理状态转移矩阵
  }
}
