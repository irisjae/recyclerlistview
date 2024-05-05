import * as React from "react";
import { Dimension } from "../dependencies/LayoutProvider";
import { AutoLayoutEvent } from "../layoutmanager/LayoutManager";
import BaseScrollView, { ScrollEvent, ScrollViewDefaultProps } from "./BaseScrollView";
export interface ScrollComponentProps {
    onSizeChanged: (dimensions: Dimension) => void;
    onScroll: (offsetX: number, offsetY: number, rawEvent: ScrollEvent) => void;
    onScrollBeginDrag: (offsetX: number, offsetY: number, rawEvent: ScrollEvent) => void;
    onScrollEndDrag: (offsetX: number, offsetY: number, rawEvent: ScrollEvent) => void;
    onMomentumScrollBegin: (offsetX: number, offsetY: number, rawEvent: ScrollEvent) => void;
    onMomentumScrollEnd: (offsetX: number, offsetY: number, rawEvent: ScrollEvent) => void;
    onAutoLayout?: (rawEvent: AutoLayoutEvent) => void;
    autoLayoutId?: number;
    contentHeight: number;
    contentWidth: number;
    canChangeSize?: boolean;
    externalScrollView?: {
        new (props: ScrollViewDefaultProps): BaseScrollView;
    };
    scrollOffset?: number;
    preservedIndex?: number;
    innerRef: any;
    isHorizontal?: boolean;
    renderFooter?: () => JSX.Element | JSX.Element[] | null;
    scrollThrottle?: number;
    useWindowScroll?: boolean;
    onLayout?: any;
    renderContentContainer?: (props?: object, children?: React.ReactNode) => React.ReactNode | null;
    renderAheadOffset: number;
    layoutSize?: Dimension;
}
export default abstract class BaseScrollComponent extends React.Component<ScrollComponentProps, {}> {
    abstract scrollTo(x: number, y: number, animate: boolean): void;
    getScrollableNode(): number | null;
}
