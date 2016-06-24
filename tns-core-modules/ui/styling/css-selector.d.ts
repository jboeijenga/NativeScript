declare module "ui/styling/css-selector" {
    import view = require("ui/core/view");
    import cssParser = require("css");
    import styleProperty = require("ui/styling/style-property");
    import keyframeAnimation = require("ui/animation/keyframe-animation");

    export interface CssSelectorVisitor {
        visitId(selector: CssIdSelector);
        visitClass(selector: CssClassSelector);
        visitType(selector: CssTypeSelector);
        visitComposite(selector: CssCompositeSelector);
        visitAttr(selector: CssAttrSelector);
        visitVisualState(selector: CssVisualStateSelector);
        visitInlineStyle(selector: InlineStyleSelector);
    }

    export class CssSelector {
        constructor(expression: string, declarations: cssParser.Declaration[]);

        expression: string;
        attrExpression: string;

        declarations(): Array<{ property: string; value: any }>;

        specificity: number;

        animations: Array<keyframeAnimation.KeyframeAnimationInfo>;

        /**
         * Perform full match.
         */
        match(view: view.View): view.View;

        /**
         * Some selectors can be split in composite rules,
         * where the "head" rule is proved to apply for an element by outside means
         * and then the rest of rules are performed here.
         */
        matchTail(view: view.View): boolean;

        apply(view: view.View, valueSourceModifier: number);

        eachSetter(callback: (property: styleProperty.Property, resolvedValue: any) => void);

        visit(visitor: CssSelectorVisitor): void;
    }

    class CssTypeSelector extends CssSelector {
        /**
         * Qualified type name, lowercasedwithoutdashes.
         * Not that in order to support both PascalCase and kebab-case we transform the type selectors before we apply them,
         * So ListView, listview, List-View, list-view must match the same elements.
         */
        type: string;
    }

    class CssIdSelector extends CssSelector {
        /**
         * Gets the id this selector matches.
         */
        id: string;
    }

    class CssClassSelector extends CssSelector {
        /**
         * Gets the class this selector matches.
         */
        cssClass: string;
    }

    class CssCompositeSelector extends CssSelector {
        /**
         * Gets the last CssSelector from the composite chain.
         * This will be suitable for pre-screening and must be one of the last CssSelectors in the chain,
         * that must match exactly the view they are applied on.
         */
        head: CssSelector;
    }

    class CssAttrSelector extends CssSelector {
    }

    export class CssVisualStateSelector extends CssSelector {
        key: string;
        state: string;
        constructor(expression: string, declarations: cssParser.Declaration[]);
    }

    export function createSelector(expression: string, declarations: cssParser.Declaration[]): CssSelector;

    class InlineStyleSelector extends CssSelector {
        constructor(declarations: cssParser.Declaration[]);
        apply(view: view.View);
    }

    export function applyInlineSyle(view: view.View, declarations: cssParser.Declaration[]);
}
