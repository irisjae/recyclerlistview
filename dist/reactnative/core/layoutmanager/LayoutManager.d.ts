import VirtualRenderer from "../VirtualRenderer";
import { Dimension, LayoutProvider } from "../dependencies/LayoutProvider";
export declare abstract class LayoutManager {
    getOffsetForIndex(index: number): Point;
    getStyleOverridesForIndex(index: number): object | undefined;
    removeLayout(index: number): void;
    abstract getContentDimension(): Dimension;
    abstract getLayouts(): Layout[];
    abstract overrideLayout(index: number, dim: Dimension): boolean;
    abstract overrideLayouts(layoutsInfo: LayoutsInfo, offsetsStale: boolean): number;
    abstract relayoutFromIndex(startIndex: number, itemCount: number): void;
    abstract refix(virtualRenderer: VirtualRenderer, innerScrollComponent: any, indexes: Array<number | undefined>, itemCount: number, scrollOffset: number, scrollTo: (scrollOffset: number) => void, scrollHeight: number, setScrollHeight: (height: number) => void, relayout: () => void, retrigger: () => void): void;
    abstract preservedIndex(): number;
    abstract preserveIndexes(visibleIndexes: number[], engagedIndexes: number[]): void;
    abstract isHoldingIndex(): boolean;
    abstract holdPreservedIndex(index: number): void;
    abstract unholdPreservedIndex(): void;
    abstract shiftPreservedIndex(index: number, shiftPreservedIndex: number): void;
    abstract shiftLayouts(indexOffset: number): void;
}
export declare class WrapGridLayoutManager extends LayoutManager {
    private _layoutProvider;
    private _window;
    private _totalHeight;
    private _totalWidth;
    private _isHorizontal;
    private _layouts;
    private _fixIndex;
    private _pendingFixY;
    private _holdingIndex;
    private _pendingRelayout;
    constructor(layoutProvider: LayoutProvider, renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]);
    preservedIndex(): number;
    preserveIndexes(visibleIndexes: number[], engagedIndexes: number[]): void;
    isHoldingIndex(): boolean;
    holdPreservedIndex(index: number): void;
    unholdPreservedIndex(): void;
    shiftPreservedIndex(index: number, shiftPreservedIndex: number): void;
    shiftLayouts(indexOffset: number): void;
    getContentDimension(): Dimension;
    getLayouts(): Layout[];
    getOffsetForIndex(index: number): Point;
    overrideLayout(index: number, dim: Dimension): boolean;
    overrideLayouts(layoutsInfo: LayoutsInfo, offsetsStale: boolean): number;
    setMaxBounds(itemDim: Dimension): void;
    relayoutFromIndex(startIndex: number, itemCount: number): void;
    refix(virtualRenderer: VirtualRenderer, innerScrollComponent: any, indexes: Array<number | undefined>, itemCount: number, scrollOffset: number, scrollTo: (scrollOffset: number) => void, scrollHeight: number, setScrollHeight: (height: number) => void, relayout: () => void, retrigger: () => void): void;
    private _preparePreservedIndex;
    private _pointDimensionsToRect;
    private _setFinalDimensions;
    private _locateFirstNeighbourIndex;
    private _checkBounds;
}
export interface Layout extends Dimension, Point {
    isOverridden?: boolean;
    type: string | number;
}
export interface Point {
    x: number;
    y: number;
}
export interface LayoutsInfo {
    layouts: Array<{
        key: number;
        height: number;
        y: number;
    }>;
}
export interface AutoLayoutEvent {
    nativeEvent: LayoutsInfo & {
        autoLayoutId: number;
    };
}
