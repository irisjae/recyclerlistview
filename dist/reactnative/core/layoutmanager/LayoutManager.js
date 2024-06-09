"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WrapGridLayoutManager = exports.LayoutManager = void 0;
var CustomError_1 = require("../exceptions/CustomError");
var LayoutManager = /** @class */ (function () {
    function LayoutManager() {
    }
    LayoutManager.prototype.getOffsetForIndex = function (index) {
        var layouts = this.getLayouts();
        if (layouts.length > index) {
            return { x: layouts[index].x, y: layouts[index].y };
        }
        else {
            throw new CustomError_1.default({
                message: "No layout available for index: " + index,
                type: "LayoutUnavailableException",
            });
        }
    };
    //You can ovveride this incase you want to override style in some cases e.g, say you want to enfore width but not height
    LayoutManager.prototype.getStyleOverridesForIndex = function (index) {
        return undefined;
    };
    //Removes item at the specified index
    LayoutManager.prototype.removeLayout = function (index) {
        var layouts = this.getLayouts();
        if (index < layouts.length) {
            layouts.splice(index, 1);
        }
        if (index === 0 && layouts.length > 0) {
            var firstLayout = layouts[0];
            firstLayout.x = 0;
            firstLayout.y = 0;
        }
    };
    return LayoutManager;
}());
exports.LayoutManager = LayoutManager;
var WrapGridLayoutManager = /** @class */ (function (_super) {
    __extends(WrapGridLayoutManager, _super);
    function WrapGridLayoutManager(layoutProvider, renderWindowSize, isHorizontal, cachedLayouts) {
        if (isHorizontal === void 0) { isHorizontal = false; }
        var _this = _super.call(this) || this;
        _this._fixIndex = -1;
        _this._pendingFixY = undefined;
        _this._holdingIndex = false;
        _this._pendingRelayout = false;
        // Fixing indexes aims to avoid visible layout shifts.
        // To achieve this, when we select an index to fix, we aim to 1) move the fix index as little as possible, 2) prefer overriden indexes,
        // and 3) prefer visible indexes.
        // 1) is because users do not expect previously viewed content to shift, wheras some degree of shifting for new content is understandable
        // 2) is because indexes which have already been overriden have known layouts, and should be more accurate. Furthermore, when overrides
        // come from nonDeterministicMode="autolayout", overriden layouts are the rendered values, and fixing to them ensures that we do not cause
        // rendered items to shift.
        // 3) is because visible content shifts occur when the total height of items between the fixed position and the rendered item changes. With
        // _fixIndex close to other visible itmes, we minimise the number of items between the fixed position and visible content, so that we
        // minimise the number of items that can cause total height changes.
        // When the above considerations cannot be met, we prefer to leave _fixIndex unchanged until they can be, as long as the previous _fixIndex
        // is still admissable.
        _this._preparePreservedIndex = function (firstVisibleIndex, lastVisibleIndex, firstEngagedIndex, lastEngagedIndex) {
            var index = -1;
            if (_this._fixIndex < firstVisibleIndex) {
                var i = 0;
                var j = 1;
                for (; i < 1 + firstVisibleIndex - firstEngagedIndex; i++) {
                    if (_this._layouts[firstVisibleIndex - i].isOverridden) {
                        index = 0;
                        break;
                    }
                }
                for (; j < Math.min(i, 1 + lastEngagedIndex - firstVisibleIndex); j++) {
                    if (_this._layouts[firstVisibleIndex + j].isOverridden) {
                        index = 0;
                        break;
                    }
                }
                if (index === 0) {
                    if (j < i) {
                        index = firstVisibleIndex + j;
                    }
                    else {
                        index = firstVisibleIndex - i;
                    }
                }
                else if (_this._fixIndex < firstEngagedIndex) {
                    index = firstVisibleIndex;
                }
            }
            else if (_this._fixIndex > lastVisibleIndex) {
                var i = 0;
                var j = 1;
                for (; i < 1 + lastEngagedIndex - lastVisibleIndex; i++) {
                    if (_this._layouts[lastVisibleIndex + i].isOverridden) {
                        index = 0;
                        break;
                    }
                }
                for (; j < Math.min(i, 1 + lastVisibleIndex - firstEngagedIndex); j++) {
                    if (_this._layouts[lastVisibleIndex - j].isOverridden) {
                        index = 0;
                        break;
                    }
                }
                if (index === 0) {
                    if (j < i) {
                        index = lastVisibleIndex - j;
                    }
                    else {
                        index = lastVisibleIndex + i;
                    }
                }
                else if (_this._fixIndex > lastEngagedIndex) {
                    index = lastVisibleIndex;
                }
            }
            if (index > -1) {
                _this._fixIndex = index;
            }
        };
        _this._layoutProvider = layoutProvider;
        _this._window = renderWindowSize;
        _this._totalHeight = 0;
        _this._totalWidth = 0;
        _this._isHorizontal = !!isHorizontal;
        _this._layouts = cachedLayouts ? cachedLayouts : [];
        return _this;
    }
    WrapGridLayoutManager.prototype.preservedIndex = function () {
        return this._fixIndex;
    };
    WrapGridLayoutManager.prototype.preserveIndexes = function (visibleIndexes, engagedIndexes) {
        if (!this._holdingIndex) {
            if (visibleIndexes.length) {
                var firstVisibleIndex = visibleIndexes[0];
                var lastVisibleIndex = visibleIndexes[visibleIndexes.length - 1];
                var firstEngagedIndex = engagedIndexes[0];
                var lastEngagedIndex = engagedIndexes[engagedIndexes.length - 1];
                this._preparePreservedIndex(firstVisibleIndex, lastVisibleIndex, firstEngagedIndex, lastEngagedIndex);
            }
        }
    };
    WrapGridLayoutManager.prototype.isHoldingIndex = function () {
        return this._holdingIndex;
    };
    WrapGridLayoutManager.prototype.holdPreservedIndex = function (index) {
        this._fixIndex = index;
        this._holdingIndex = true;
    };
    WrapGridLayoutManager.prototype.unholdPreservedIndex = function () {
        this._holdingIndex = false;
    };
    WrapGridLayoutManager.prototype.shiftPreservedIndex = function (index, shiftPreservedIndex) {
        this._fixIndex = shiftPreservedIndex;
        this._pendingFixY = this._layouts[index].y;
    };
    WrapGridLayoutManager.prototype.shiftLayouts = function (indexOffset) {
        // shift existing layout by an offset
        // this is called when data changes
        // purpose is: assuming that most layout sizes have not changed, we want to keep existing
        // values of layout sizes already obtained, so that we prevent layout thrashing
        // this is especially relevant the data change happens after many layouts have been overridden
        // so the layouting trusts the values, but if all indices are shifted, they could be all wrong
        var _a;
        // fill in invalid placeholder values; these will be properly calculated during relayout
        this._pendingRelayout = true;
        if (indexOffset > 0) {
            var layoutCount = this._layouts.length;
            var placeholderLayouts = [];
            for (var i = 0; i < indexOffset; i++) {
                placeholderLayouts.push({ x: 0, y: 0, height: 0, width: 0, type: 0 });
            }
            (_a = this._layouts).splice.apply(_a, __spreadArray([0, 0], placeholderLayouts, false));
        }
        else if (indexOffset < 0) {
            this._layouts.splice(0, -indexOffset);
        }
    };
    WrapGridLayoutManager.prototype.getContentDimension = function () {
        return { height: this._totalHeight, width: this._totalWidth };
    };
    WrapGridLayoutManager.prototype.getLayouts = function () {
        return this._layouts;
    };
    WrapGridLayoutManager.prototype.getOffsetForIndex = function (index) {
        if (this._layouts.length > index) {
            return { x: this._layouts[index].x, y: this._layouts[index].y };
        }
        else {
            throw new CustomError_1.default({
                message: "No layout available for index: " + index,
                type: "LayoutUnavailableException",
            });
        }
    };
    WrapGridLayoutManager.prototype.overrideLayout = function (index, dim) {
        var layout = this._layouts[index];
        if (layout) {
            if (dim.height !== layout.height) {
                this._pendingRelayout = true;
            }
            layout.isOverridden = true;
            layout.width = dim.width;
            layout.height = dim.height;
        }
        return true;
    };
    WrapGridLayoutManager.prototype.overrideLayouts = function (layoutsInfo, offsetsStale) {
        var inconsistentIndex = -1;
        var renderedLayouts = layoutsInfo.layouts;
        for (var i = 0; i < renderedLayouts.length; i++) {
            var _a = renderedLayouts[i], key = _a.key, y = _a.y, height = _a.height;
            var layout = this._layouts[key];
            if (layout) {
                // callers should provide renderedLayouts in sorted order
                if (inconsistentIndex === -1) {
                    if (Math.abs(height - layout.height) > 1) {
                        inconsistentIndex = Math.max(0, key - 1);
                    }
                    else if (Math.abs(y - layout.y) > 1) {
                        inconsistentIndex = key;
                    }
                }
                layout.height = height;
                if (!offsetsStale) {
                    layout.isOverridden = true;
                    layout.y = y;
                }
            }
        }
        var count = this._layouts.length;
        if (inconsistentIndex > -1) {
            this._pendingRelayout = true;
        }
        return inconsistentIndex;
    };
    WrapGridLayoutManager.prototype.setMaxBounds = function (itemDim) {
        if (this._isHorizontal) {
            itemDim.height = Math.min(this._window.height, itemDim.height);
        }
        else {
            itemDim.width = Math.min(this._window.width, itemDim.width);
        }
    };
    //TODO:Talha laziliy calculate in future revisions
    WrapGridLayoutManager.prototype.relayoutFromIndex = function (startIndex, itemCount) {
        this._pendingRelayout = false;
        if (this._pendingFixY !== undefined && startIndex > this._fixIndex) {
            startIndex = this._fixIndex;
        }
        startIndex = this._locateFirstNeighbourIndex(startIndex);
        var startX = 0;
        var startY = 0;
        var maxBound = 0;
        var oldItemCount = this._layouts.length;
        var itemDim = { height: 0, width: 0 };
        var itemRect = null;
        var oldLayout = null;
        var index = startIndex;
        if (startIndex <= this._fixIndex) {
            for (; index < Math.min(oldItemCount - 1, itemCount - 1, this._fixIndex); index++) {
                oldLayout = this._layouts[index];
                var layoutType = this._layoutProvider.getLayoutTypeForIndex(index);
                if (oldLayout && oldLayout.isOverridden && oldLayout.type === layoutType) {
                    itemDim.height = oldLayout.height;
                    itemDim.width = oldLayout.width;
                }
                else {
                    this._layoutProvider.setComputedLayout(layoutType, itemDim, index);
                }
                this.setMaxBounds(itemDim);
                itemRect = this._layouts[index];
                itemRect.type = layoutType;
                itemRect.width = itemDim.width;
                itemRect.height = itemDim.height;
            }
            oldLayout = this._layouts[index];
            var fixLayoutType = this._layoutProvider.getLayoutTypeForIndex(index);
            if (oldLayout && oldLayout.isOverridden && oldLayout.type === fixLayoutType) {
                itemDim.height = oldLayout.height;
                itemDim.width = oldLayout.width;
            }
            else {
                this._layoutProvider.setComputedLayout(fixLayoutType, itemDim, index);
            }
            this.setMaxBounds(itemDim);
            itemRect = this._layouts[index];
            itemRect.type = fixLayoutType;
            itemRect.width = itemDim.width;
            itemRect.height = itemDim.height;
            // fix backwards
            if (this._pendingFixY !== undefined) {
                itemRect.y = this._pendingFixY;
                this._pendingFixY = undefined;
            }
            var fixY = itemRect.y;
            var i = index - 1;
            for (; i >= startIndex; i--) {
                fixY -= this._layouts[i].height;
                this._layouts[i].y = fixY;
            }
            for (; i >= 0; i--) {
                fixY -= this._layouts[i].height;
                if (this._layouts[i].y === fixY) {
                    break;
                }
                else {
                    this._layouts[i].y = fixY;
                }
            }
            // set loop state as if looped until index
            maxBound = itemDim.height;
            var startVal = this._layouts[index];
            startX = itemDim.width;
            startY = startVal.y;
            this._pointDimensionsToRect(startVal);
            index = index + 1;
        }
        else {
            var startVal = this._layouts[startIndex];
            if (startVal) {
                startX = startVal.x;
                startY = startVal.y;
                this._pointDimensionsToRect(startVal);
            }
        }
        for (; index < itemCount; index++) {
            oldLayout = this._layouts[index];
            var layoutType = this._layoutProvider.getLayoutTypeForIndex(index);
            if (oldLayout && oldLayout.isOverridden && oldLayout.type === layoutType) {
                itemDim.height = oldLayout.height;
                itemDim.width = oldLayout.width;
            }
            else {
                this._layoutProvider.setComputedLayout(layoutType, itemDim, index);
            }
            this.setMaxBounds(itemDim);
            if (!this._checkBounds(startX, startY, itemDim, this._isHorizontal)) {
                if (this._isHorizontal) {
                    startX += maxBound;
                    startY = 0;
                    this._totalWidth += maxBound;
                }
                else {
                    startX = 0;
                    startY += maxBound;
                    this._totalHeight += maxBound;
                }
                maxBound = 0;
            }
            maxBound = this._isHorizontal ? Math.max(maxBound, itemDim.width) : Math.max(maxBound, itemDim.height);
            //TODO: Talha creating array upfront will speed this up
            if (index > oldItemCount - 1) {
                this._layouts.push({ x: startX, y: startY, height: itemDim.height, width: itemDim.width, type: layoutType });
            }
            else {
                itemRect = this._layouts[index];
                itemRect.x = startX;
                itemRect.y = startY;
                itemRect.type = layoutType;
                itemRect.width = itemDim.width;
                itemRect.height = itemDim.height;
            }
            if (this._isHorizontal) {
                startY += itemDim.height;
            }
            else {
                startX += itemDim.width;
            }
        }
        if (oldItemCount > itemCount) {
            this._layouts.splice(itemCount, oldItemCount - itemCount);
        }
        this._setFinalDimensions(maxBound);
    };
    WrapGridLayoutManager.prototype.refix = function (virtualRenderer, innerScrollComponent, indexes, itemCount, scrollOffset, scrollTo, scrollHeight, setScrollHeight, relayout, retrigger) {
        if (this._pendingRelayout) {
            retrigger();
        }
        else {
            var refixOffset = -this._layouts[0].y;
            // if the content height is not as tall as the scroll destination, scrollTo will fail
            // so, we must first set the height the content before we do the rest of refix
            if (scrollHeight < Math.min(scrollOffset, this._totalHeight) + refixOffset) {
                innerScrollComponent.setNativeProps({ style: { height: this._totalHeight + refixOffset } });
                innerScrollComponent.measure(function (x, y, width, height, pageX, pageY) {
                    setScrollHeight(height);
                    retrigger();
                });
            }
            else {
                if (refixOffset !== 0) {
                    for (var i = 0; i < itemCount; i++) {
                        this._layouts[i].y += refixOffset;
                    }
                    this._totalHeight += refixOffset;
                    if (Math.abs(refixOffset) >= 1) {
                        innerScrollComponent.setNativeProps({ style: { height: this._totalHeight } });
                        for (var i = 0; i < indexes.length; i++) {
                            var index = indexes[i];
                            if ((index !== undefined) && innerScrollComponent._children[i]) {
                                var y = this._layouts[index].y;
                                innerScrollComponent._children[i].setNativeProps({ style: { top: y } });
                            }
                        }
                        relayout();
                        scrollTo(scrollOffset + refixOffset);
                    }
                    var viewabilityTracker = virtualRenderer.getViewabilityTracker();
                    if (viewabilityTracker) {
                        viewabilityTracker._currentOffset += refixOffset;
                        viewabilityTracker._maxOffset += refixOffset;
                        viewabilityTracker._visibleWindow.start += refixOffset;
                        viewabilityTracker._visibleWindow.end += refixOffset;
                        viewabilityTracker._engagedWindow.start += refixOffset;
                        viewabilityTracker._engagedWindow.end += refixOffset;
                        viewabilityTracker._actualOffset += refixOffset;
                    }
                }
                else {
                    innerScrollComponent.setNativeProps({ style: { height: this._totalHeight } });
                }
            }
        }
    };
    WrapGridLayoutManager.prototype._pointDimensionsToRect = function (itemRect) {
        if (this._isHorizontal) {
            this._totalWidth = itemRect.x;
        }
        else {
            this._totalHeight = itemRect.y;
        }
    };
    WrapGridLayoutManager.prototype._setFinalDimensions = function (maxBound) {
        if (this._isHorizontal) {
            this._totalHeight = this._window.height;
            this._totalWidth += maxBound;
        }
        else {
            this._totalWidth = this._window.width;
            this._totalHeight += maxBound;
        }
    };
    WrapGridLayoutManager.prototype._locateFirstNeighbourIndex = function (startIndex) {
        if (startIndex === 0) {
            return 0;
        }
        var i = startIndex - 1;
        for (; i >= 0; i--) {
            if (this._isHorizontal) {
                if (this._layouts[i].y === 0) {
                    break;
                }
            }
            else if (this._layouts[i].x === 0) {
                break;
            }
        }
        return i;
    };
    WrapGridLayoutManager.prototype._checkBounds = function (itemX, itemY, itemDim, isHorizontal) {
        return isHorizontal ? (itemY + itemDim.height <= this._window.height + 0.9) : (itemX + itemDim.width <= this._window.width + 0.9);
    };
    return WrapGridLayoutManager;
}(LayoutManager));
exports.WrapGridLayoutManager = WrapGridLayoutManager;
//# sourceMappingURL=LayoutManager.js.map