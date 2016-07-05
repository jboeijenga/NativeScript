import {Node, Declaration} from "ui/styling/css-selector";
import {isNullOrUndefined} from "utils/types";
import {escapeRegexSymbols} from "utils/utils";

import * as cssParser from "css";
import * as selectorParser from "./css-selector-parser";

const enum Specificity {
    Inline =        0x01000000,
    Id =            0x00010000,
    Attribute =     0x00000100,
    Class =         0x00000100,
    PseudoClass =   0x00000100,
    Type =          0x00000001,
    Universal =     0x00000000,
    Invalid =       0x00000000
}

const enum Rarity {
    Invalid = 4,
    Id = 3,
    Class = 2,
    Type = 1,
    PseudoClass = 0, 
    Attribute = 0,
    Universal = 0,
    Inline = 0
}

interface LookupSorter {
    sortById(id: string, sel: SelectorCore);
    sortByClass(cssClass: string, sel: SelectorCore);
    sortByType(cssType: string, sel: SelectorCore);
    sortAsUniversal(sel: SelectorCore);
}

function SelProps(specificity: Specificity, rarity: Rarity): ClassDecorator {
    return cls => {
        cls.prototype.specificity = specificity;
        cls.prototype.rarity = rarity;
        cls.prototype.combinator = "";
        return cls;
    }
}

declare type Combinator = "+" | ">" | "~" | " ";
@SelProps(Specificity.Universal, Rarity.Universal)
export abstract class SelectorCore {
    public specificity: number;
    public rarity: Rarity;
    public combinator: Combinator;
    public ruleset: RuleSet;
    public abstract match(node: Node): boolean;
    public lookupSort(sorter: LookupSorter, base?: SelectorCore): void { sorter.sortAsUniversal(base || this); }
}

export abstract class SimpleSelector extends SelectorCore {
}

function wrap(text: string): string {
    return text ? ` ${text} ` : "";
}

@SelProps(Specificity.Invalid, Rarity.Invalid)
export class InvalidSelector extends SimpleSelector {
    constructor(public e: Error) { super(); }
    public toString(): string { return `<error: ${this.e}>`; }
    public match(node: Node): boolean { return false; }
    public lookupSort(sorter: LookupSorter, base?: SelectorCore): void {}
}

@SelProps(Specificity.Universal, Rarity.Universal)
export class UniversalSelector extends SimpleSelector {
    public toString(): string { return `*${wrap(this.combinator)}`; }
    public match(node: Node): boolean { return true; }
}

@SelProps(Specificity.Id, Rarity.Id)
export class IdSelector extends SimpleSelector {
    constructor(public id: string) { super(); }
    public toString(): string { return `#${this.id}${wrap(this.combinator)}`; }
    public match(node: Node): boolean { return node.id === this.id; }
    public lookupSort(sorter: LookupSorter, base?: SelectorCore): void { sorter.sortById(this.id, base || this); }
}

@SelProps(Specificity.Type, Rarity.Type)
export class TypeSelector extends SimpleSelector {
    constructor(public cssType: string) { super(); }
    public toString(): string { return `${this.cssType}${wrap(this.combinator)}`; }
    public match(node: Node): boolean { return node.cssType === this.cssType; }
    public lookupSort(sorter: LookupSorter, base?: SelectorCore): void { sorter.sortByType(this.cssType, base || this); }
}

@SelProps(Specificity.Class, Rarity.Class)
export class ClassSelector extends SimpleSelector {
    constructor(public cssClass: string) { super(); }
    public toString(): string { return `.${this.cssClass}${wrap(this.combinator)}`; }
    public match(node: Node): boolean { return node.cssClasses && node.cssClasses.has(this.cssClass); }
    public lookupSort(sorter: LookupSorter, base?: SelectorCore): void { sorter.sortByClass(this.cssClass, base || this); }
}

declare type AttributeTest = "=" | "^=" | "$=" | "*=" | "=" | "~=" | "|=";
@SelProps(Specificity.Attribute, Rarity.Attribute)
export class AttributeSelector extends SimpleSelector {
    constructor(public attribute: string, public test?: AttributeTest, public value?: string) {
        super();

        if (!test) {
            // HasAttribute
            this.match = node => !isNullOrUndefined(node[attribute]);
            return;
        }

        if (!value) {
            this.match = node => false;
        }

        let escapedValue = escapeRegexSymbols(value);
        let regexp: RegExp = null;
        switch(test) {
            case "^=": // PrefixMatch
                regexp = new RegExp("^" + escapedValue);
                break;
            case "$=": // SuffixMatch
                regexp = new RegExp(escapedValue + "$");
                break;
            case "*=": // SubstringMatch
                regexp = new RegExp(escapedValue);
                break;
            case "=": // Equals
                regexp = new RegExp("^" + escapedValue + "$");
                break;
            case "~=": // Includes
                if (/\s/.test(value)) {
                    this.match = node => false;
                    return;
                }
                regexp = new RegExp("(^|\\s)" + escapedValue + "(\\s|$)");
                break;
            case "|=": // DashMatch
                regexp = new RegExp("^" + escapedValue + "(-|$)");
                break;
        }

        if (regexp) {
            this.match = node => regexp.test(node[attribute] + "");
            return;
        } else {
            this.match = node => false;
            return;
        }
    }
    public get specificity(): number { return Specificity.Attribute; }
    public get rarity(): number { return Specificity.Attribute; }
    public toString(): string { return `[${this.attribute}${wrap(this.test)}${(this.test && this.value) || ''}]${wrap(this.combinator)}`; }
    public match(node: Node): boolean { return false; }
}

@SelProps(Specificity.PseudoClass, Rarity.PseudoClass)
export class PseudoClassSelector extends SimpleSelector {
    constructor(public cssPseudoClass: string) { super(); }
    public toString(): string { return `:${this.cssPseudoClass}${wrap(this.combinator)}`; }
    public match(node: Node): boolean { return node.cssPseudoClasses && node.cssPseudoClasses.has(this.cssPseudoClass); }
}

export class SimpleSelectorSequence extends SelectorCore {
    private head: SimpleSelector;
    constructor(public selectors: SimpleSelector[]) {
        super();
        this.specificity = selectors.reduce((sum, sel) => sel.specificity + sum, 0);
        this.head = this.selectors.reduce((prev, curr) => !prev || (curr.rarity > prev.rarity) ? curr : prev, null);
    }
    public toString(): string { return `${this.selectors.join("")}${wrap(this.combinator)}`; }
    public match(node: Node): boolean { return this.selectors.every(sel => sel.match(node)); }
    public lookupSort(sorter: LookupSorter, base?: SelectorCore): void {
        this.head.lookupSort(sorter, base || this);
    }
}

export class Selector extends SelectorCore {
    private selectorsReversed: (SimpleSelectorSequence | SimpleSelector)[];
    constructor(public selectors: (SimpleSelectorSequence | SimpleSelector)[]) {
        super();
        this.selectorsReversed = selectors.reverse();
        this.specificity = selectors.reduce((sum, sel) => sel.specificity + sum, 0);
    }
    public toString(): string { return this.selectors.join(""); }
    public match(node: Node): boolean {
        return this.selectorsReversed.every(sel => {
            switch(sel.combinator) {
                case undefined: return sel.match(node);
                case ">": return (node = node.parent) && sel.match(node);
                case " ":
                    while(node = node.parent) {
                        if (sel.match(node)) {
                            return true;
                        }
                    }
                    return false;
                case "~":
                case "+":
                default:
                    throw new Error(`Unsupported combinator '${sel.combinator}'`);
            }
        });
    }
    public lookupSort(sorter: LookupSorter, base?: SelectorCore): void {
        this.selectorsReversed[0].lookupSort(sorter, this);
    }
}

export class RuleSet {
    constructor(public selectors: SelectorCore[], private declarations: Declaration[]) {
        this.selectors.forEach(sel => sel.ruleset = this);
    }
    public toString(): string { return `${this.selectors.join(", ")} {${this.declarations.map((d, i) => `${i == 0 ? " ": ""}${d.property}: ${d.value}`).join("; ")} }`; }
    public lookupSort(sorter: LookupSorter): void { this.selectors.forEach(sel => sel.lookupSort(sorter)); }
}

export function fromAstNodes(astRules: cssParser.Node[]): RuleSet[] {
    return astRules.filter(isRule).map(rule => {
        let declarations = rule.declarations.filter(isDeclaration).map(createDeclaration);
        let selectors = rule.selectors.map(createSelector);
        let ruleset = new RuleSet(selectors, declarations);
        return ruleset;
    });
}

function createDeclaration(decl: cssParser.Declaration): any {
    return { property: decl.property.toLowerCase(), value: decl.value };
}

function createSelector(sel: string): SimpleSelector | SimpleSelectorSequence | Selector {
    try {
        let ast = selectorParser.parse(sel);
        if (ast.length === 0) {
            return new InvalidSelector(new Error("Empty selector"));
        }

        let selectors = ast.map(createSimpleSelector);
        let sequences: (SimpleSelector | SimpleSelectorSequence)[] = [];

        // Join simple selectors into sequences, set combinators
        for (let seqStart = 0, seqEnd = 0, last = selectors.length - 1; seqEnd <= last; seqEnd++) {
            let sel = selectors[seqEnd];
            let astComb = ast[seqEnd].comb;
            if (astComb || seqEnd === last) {
                if (seqStart === seqEnd) {
                    // This is a sequnce with single SimpleSelector, so we will not combine it into SimpleSelectorSequence.
                    sel.combinator = astComb;
                    sequences.push(sel);
                } else {
                    let sequence = new SimpleSelectorSequence(selectors.slice(seqStart, seqEnd + 1));
                    sequence.combinator = astComb;
                    sequences.push(sequence);
                }
                seqStart = seqEnd + 1;
            }
        }

        if (sequences.length === 1) {
            // This is a selector with a single SinmpleSelectorSequence so we will not combine it into Selector.
            return sequences[0];
        } else {
            return new Selector(sequences);
        }
    } catch(e) {
        return new InvalidSelector(e);
    }
}

function createSimpleSelector(sel: selectorParser.SimpleSelector): SimpleSelector {
    if (selectorParser.isUniversal(sel)) {
        return new UniversalSelector();
    } else if (selectorParser.isId(sel)) {
        return new IdSelector(sel.ident);
    } else if (selectorParser.isType(sel)) {
        return new TypeSelector(sel.ident.replace(/-/, '').toLowerCase());
    } else if (selectorParser.isClass(sel)) {
        return new ClassSelector(sel.ident);
    } else if (selectorParser.isPseudo(sel)) {
        return new PseudoClassSelector(sel.ident);
    } else if (selectorParser.isAttribute(sel)) {
        if (sel.test) {
            return new AttributeSelector(sel.prop, sel.test, sel.value);
        } else {
            return new AttributeSelector(sel.prop)
        }
    }
}

function isRule(node: cssParser.Node): node is cssParser.Rule {
    return node.type === "rule";
}
function isDeclaration(node: cssParser.Node): node is cssParser.Declaration {
    return node.type === "declaration";
}

interface SelectorInDocument {
    pos: number;
    sel: SelectorCore;
}
interface SelectorMap {
    [key: string]: SelectorInDocument[]
}
export class SelectorsMap implements LookupSorter {
    private id: SelectorMap = {};
    private class: SelectorMap = {};
    private type: SelectorMap = {};
    private universal: SelectorInDocument[] = [];

    private position = 0;

    constructor(rulesets: RuleSet[]) {
        rulesets.forEach(rule => rule.lookupSort(this));
    }

    query(node: Node): SelectorCore[] {
        let selectorClasses = [
            this.universal,
            this.id[node.id],
            this.type[node.cssType]
        ];
        node.cssClasses && node.cssClasses.forEach(c => selectorClasses.push(this.class[c]));
        let selectors = selectorClasses
            .filter(arr => !!arr)
            .reduce((cur, next) => cur.concat(next), [])
            .sort((a, b) => a.sel.specificity - b.sel.specificity || a.pos - b.pos)
            .map(docSel => docSel.sel);
        return selectors;
    }

    sortById(id: string, sel: SelectorCore): void { this.addToMap(this.id, id, sel); }
    sortByClass(cssClass: string, sel: SelectorCore): void {
        this.addToMap(this.class, cssClass, sel);
    }
    sortByType(cssType: string, sel: SelectorCore): void {
        this.addToMap(this.type, cssType, sel);
    }
    sortAsUniversal(sel: SelectorCore): void { this.universal.push(this.makeDocSelector(sel)); }

    private addToMap(map: SelectorMap, head: string, sel: SelectorCore): void {
        this.position++;
        let list = map[head];
        if (list) {
            list.push(this.makeDocSelector(sel));
        } else {
            map[head] = [this.makeDocSelector(sel)];
        }
    }

    private makeDocSelector(sel: SelectorCore): SelectorInDocument {
        return { sel, pos: this.position++ };
    }
}
