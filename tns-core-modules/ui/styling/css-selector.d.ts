declare module "ui/styling/css-selector" {
    import * as parser from "css";

    /**
     * An interface describing the shape of a type on which the selectors may apply.
     * Note, the ui/core/view implements Node.
     * To specify which pseudo-class states are on or off, set node[state("<name>")] to boolean.
     */
    interface Node {
        parent?: Node;

        id?: string;
        cssType?: string;
        cssClasses?: Set<string>;
        cssPseudoClasses?: Set<string>;
    }

    interface Declaration {
        property: string;
        value: string;
    }

    class SelectorCore {
        match(node: Node): boolean;
        ruleset: RuleSet;
    }

    class RuleSet {
        /**
         * Gets the selectors in this ruleset's selector group.
         */
        selectors: SelectorCore[];

        /**
         * Gets the key-value list of declarations for the ruleset.
         */
        declarations: Declaration[];
    }

    class SelectorsMap {
        constructor(rules: RuleSet[]);

        /**
         * Get a list of selectors that are likely to match the node.
         */
        query(node: Node): SelectorsMatch;
    }

    interface Dependencies {
        attributes: Set<string>;
        pseudoClasses: Set<string>;
    }

    class SelectorsMatch {
        selectors: SelectorCore[];
        /**
         * Gets a map of nodes to attributes and pseudo classes, that may affect the state of the dynamic 
         */
        changeMap: Map<Node, Dependencies>;
    }

    export function fromAstNodes(astRules: parser.Node[]): RuleSet[];
}
