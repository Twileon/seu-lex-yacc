"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Regex_1 = require("./seulex/core/Regex");
const NFA_1 = require("./seulex/core/NFA");
const Visualizer_1 = require("./seulex/core/Visualizer");
const DFA_1 = require("./seulex/core/DFA");
let re = new Regex_1.Regex(`t" "m`);
let re2 = new Regex_1.Regex(`hoy+s`);
let re3 = new Regex_1.Regex(`wt?f`);
let re4 = new Regex_1.Regex(`g|sty`);
let re5 = new Regex_1.Regex(`dd*up`);
console.log(re.raw);
console.log(re.escapeExpanded);
console.log(re.rangeExpanded);
console.log(re.dotAdded);
console.log(re.postFix);
let nfa = NFA_1.NFA.parallelAll(NFA_1.NFA.fromRegex(re), NFA_1.NFA.fromRegex(re2), NFA_1.NFA.fromRegex(re3), NFA_1.NFA.fromRegex(re4), NFA_1.NFA.fromRegex(re5));
let dfa = new DFA_1.DFA(nfa);
dfa.minimize();
Visualizer_1.visualizeFA(dfa);
console.log(dfa);
//# sourceMappingURL=playground.js.map