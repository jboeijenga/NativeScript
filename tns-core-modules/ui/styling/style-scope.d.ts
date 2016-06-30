//@private
declare module "ui/styling/style-scope" {
    import view = require("ui/core/view");
    import cssParser = require("css");
    import {RuleSet, Node, SelectorCore} from "ui/styling/css-selector";
    import {KeyframeAnimationInfo} from "ui/animation/keyframe-animation";

    export class CssState {
        /**
         * Re-evaluate the selectors and apply any changes to the underlying view.
         */
        public update(): void;
    }

    export class StyleScope {
        public css: string;
        public addCss(cssString: string, cssFileName: string): void;

        public static createSelectorsFromCss(css: string, cssFileName: string, keyframes: Object): RuleSet[];
        public static createSelectorsFromImports(tree: cssParser.SyntaxTree, keyframes: Object): RuleSet[];
        public ensureSelectors(): boolean;

        public applySelectors(view: view.View): void
        public query(options: Node): SelectorCore[];

        public getKeyframeAnimationWithName(animationName: string): KeyframeAnimationInfo;
        public getAnimations(ruleset: RuleSet): KeyframeAnimationInfo[];
    }

    export function applyInlineSyle(view: view.View, style: string): void;
}
