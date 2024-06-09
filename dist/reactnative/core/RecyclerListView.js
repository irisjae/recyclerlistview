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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
/***
 * DONE: Reduce layout processing on data insert
 * DONE: Add notify data set changed and notify data insert option in data source
 * DONE: Add on end reached callback
 * DONE: Make another class for render stack generator
 * DONE: Simplify rendering a loading footer
 * DONE: Anchor first visible index on any insert/delete data wise
 * DONE: Build Scroll to index
 * DONE: Give viewability callbacks
 * DONE: Add full render logic in cases like change of dimensions
 * DONE: Fix all proptypes
 * DONE: Add Initial render Index support
 * DONE: Add animated scroll to web scrollviewer
 * DONE: Animate list view transition, including add/remove
 * DONE: Implement sticky headers and footers
 * TODO: Destroy less frequently used items in recycle pool, this will help in case of too many types.
 * TODO: Make viewability callbacks configurable
 * TODO: Observe size changes on web to optimize for reflowability
 * TODO: Solve //TSI
 */
var debounce = require("lodash.debounce");
var throttle = require("lodash.throttle");
var PropTypes = require("prop-types");
var React = require("react");
var ts_object_utils_1 = require("ts-object-utils");
var ContextProvider_1 = require("./dependencies/ContextProvider");
var DataProvider_1 = require("./dependencies/DataProvider");
var LayoutProvider_1 = require("./dependencies/LayoutProvider");
var CustomError_1 = require("./exceptions/CustomError");
var RecyclerListViewExceptions_1 = require("./exceptions/RecyclerListViewExceptions");
var Constants_1 = require("./constants/Constants");
var Messages_1 = require("./constants/Messages");
var VirtualRenderer_1 = require("./VirtualRenderer");
var ItemAnimator_1 = require("./ItemAnimator");
var ComponentCompat_1 = require("../utils/ComponentCompat");
//#if [REACT-NATIVE]
var ScrollComponent_1 = require("../platform/reactnative/scrollcomponent/ScrollComponent");
var ViewRenderer_1 = require("../platform/reactnative/viewrenderer/ViewRenderer");
var react_native_1 = require("react-native");
var IS_WEB = !react_native_1.Platform || react_native_1.Platform.OS === "web";
var RecyclerListView = /** @class */ (function (_super) {
    __extends(RecyclerListView, _super);
    function RecyclerListView(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.refreshRequestDebouncer = debounce(function (executable) {
            executable();
        });
        _this._onEndReachedCalled = false;
        _this._initComplete = false;
        _this._isMounted = true;
        _this._relayoutReqIndex = -1;
        _this._params = {
            initialOffset: 0,
            initialRenderIndex: 0,
            isHorizontal: false,
            itemCount: 0,
            renderAheadOffset: 250,
        };
        _this._layout = { height: 0, width: 0 };
        _this._pendingScrollToOffset = null;
        _this._tempDim = { height: 0, width: 0 };
        _this._initialOffset = 0;
        _this._scrollComponent = null;
        _this._innerScrollComponent = null;
        _this._scrollOffset = 0;
        _this._scrollHeight = 0;
        _this._isUserScrolling = false;
        _this._isMomentumScrolling = false;
        _this._edgeVisibleThreshold = 20;
        _this._isEdgeVisible = true;
        _this._autoLayout = false;
        _this._pendingAutoLayout = true;
        _this._baseAutoLayoutId = 0x00000000;
        _this._autoLayoutId = 0x00000000;
        //If the native content container is used, then positions of the list items are changed on the native side. The animated library used
        //by the default item animator also changes the same positions which could lead to inconsistency. Hence, the base item animator which
        //does not perform any such animations will be used.
        _this._defaultItemAnimator = new ItemAnimator_1.BaseItemAnimator();
        // useWindowCorrection specifies if correction should be applied to these offsets in case you implement
        // `applyWindowCorrection` method
        _this.scrollToOffset = function (x, y, animate, useWindowCorrection, relativeIndex, getScrollCoords) {
            var _a;
            if (animate === void 0) { animate = false; }
            if (useWindowCorrection === void 0) { useWindowCorrection = false; }
            if (relativeIndex === void 0) { relativeIndex = -1; }
            if (_this._scrollComponent) {
                if (_this.props.isHorizontal) {
                    y = 0;
                    x = useWindowCorrection ? x - _this._windowCorrectionConfig.value.windowShift : x;
                }
                else {
                    x = 0;
                    y = useWindowCorrection ? y - _this._windowCorrectionConfig.value.windowShift : y;
                }
                if (relativeIndex > -1) {
                    var virtualRenderer_1 = _this._virtualRenderer;
                    var preserveVisiblePosition = virtualRenderer_1.getPreserveVisiblePosition();
                    var layoutManager_1 = virtualRenderer_1.getLayoutManager();
                    if (preserveVisiblePosition && layoutManager_1) {
                        var engagedIndexes = (_a = virtualRenderer_1.getViewabilityTracker()) === null || _a === void 0 ? void 0 : _a.getEngagedIndexes();
                        var firstEngagedIndex = engagedIndexes ? engagedIndexes[0] : -1;
                        var lastEngagedIndex = engagedIndexes ? engagedIndexes[engagedIndexes.length - 1] : -1;
                        if (_this._pendingAutoLayout && relativeIndex >= firstEngagedIndex && relativeIndex <= lastEngagedIndex) {
                            _this._pendingScroll = function () {
                                if (getScrollCoords) {
                                    var coords = getScrollCoords();
                                    if (!coords) {
                                        return;
                                    }
                                    x = coords.x;
                                    y = coords.y;
                                }
                                _this.scrollToOffset(x, y, animate, useWindowCorrection, relativeIndex, getScrollCoords);
                            };
                        }
                        else {
                            layoutManager_1.holdPreservedIndex(relativeIndex);
                            _this._holdStableId = _this.props.dataProvider.getStableId(relativeIndex);
                            if (_this._autoLayout) {
                                _this._autoLayoutId = (_this._autoLayoutId + 1) & 0x7FFFFFFF;
                                if (_this._autoLayoutId === _this._baseAutoLayoutId) {
                                    _this._baseAutoLayoutId = (_this._baseAutoLayoutId ^ 0x40000000) & 0x7FFFFFFF;
                                }
                            }
                            if (animate) {
                                // the amount of time taken for the animation is variable
                                // on ios, the animation is documented to be 'constant rate' at an unspecified rate, so the time is proportional to the length of scroll
                                // on android, the only relevant information the author has discovered is that default animation duration is 250ms.
                                // therefore, we hold until relativeIndex comes into view + a little time (especially for low-end devices) such that all scroll events have fired
                                if (_this._holdTimer !== undefined) {
                                    clearInterval(_this._holdTimer);
                                }
                                _this._holdTimer = setInterval(function () {
                                    var _a;
                                    if (Math.abs(_this._scrollOffset - y) < 1) {
                                        var visibleIndexes = (_a = virtualRenderer_1.getViewabilityTracker()) === null || _a === void 0 ? void 0 : _a.getVisibleIndexes();
                                        if (visibleIndexes) {
                                            // Even though we have held the index, it may have been shifted by data changes
                                            var preservedIndex = layoutManager_1.preservedIndex();
                                            for (var i = 0; i < visibleIndexes.length; i++) {
                                                if (visibleIndexes[i] === preservedIndex) {
                                                    clearInterval(_this._holdTimer);
                                                    _this._holdTimer = undefined;
                                                    setTimeout(function () {
                                                        layoutManager_1.unholdPreservedIndex();
                                                        _this._holdStableId = undefined;
                                                    }, 150);
                                                }
                                            }
                                        }
                                    }
                                    // We check every once in a while (three frames)
                                }, 48);
                            }
                            else {
                                setTimeout(function () {
                                    layoutManager_1.unholdPreservedIndex();
                                    _this._holdStableId = undefined;
                                }, 150);
                            }
                        }
                    }
                }
                _this._scrollComponent.scrollTo(x, y, animate);
            }
        };
        _this._onItemLayout = function (index) {
            _this.onItemLayout(index);
        };
        _this._onSizeChanged = function (layout) {
            if (layout.height === 0 || layout.width === 0) {
                if (!_this.props.suppressBoundedSizeException) {
                    throw new CustomError_1.default(RecyclerListViewExceptions_1.default.layoutException);
                }
                else {
                    return;
                }
            }
            if (!_this.props.canChangeSize && _this.props.layoutSize) {
                return;
            }
            var hasHeightChanged = _this._layout.height !== layout.height;
            var hasWidthChanged = _this._layout.width !== layout.width;
            _this._layout.height = layout.height;
            _this._layout.width = layout.width;
            if (!_this._initComplete) {
                _this._initComplete = true;
                _this._initTrackers(_this.props);
                _this._processOnEndReached();
            }
            else {
                if ((hasHeightChanged && hasWidthChanged) ||
                    (hasHeightChanged && _this.props.isHorizontal) ||
                    (hasWidthChanged && !_this.props.isHorizontal)) {
                    _this._checkAndChangeLayouts(_this.props, true);
                }
                else {
                    _this._refreshViewability();
                }
            }
        };
        _this._renderStackWhenReady = function (stack) {
            // TODO: Flickers can further be reduced by setting _pendingScrollToOffset in constructor
            // rather than in _onSizeChanged -> _initTrackers
            if (_this._pendingScrollToOffset) {
                _this._pendingRenderStack = stack;
                return;
            }
            if (!_this._initStateIfRequired(stack)) {
                _this.setState(function () {
                    return { renderStack: stack };
                });
            }
        };
        _this._dataHasChanged = function (row1, row2) {
            return _this.props.dataProvider.rowHasChanged(row1, row2);
        };
        _this._onViewContainerSizeChange = function (dim, index) {
            //Cannot be null here
            var layoutManager = _this._virtualRenderer.getLayoutManager();
            if (_this.props.debugHandlers && _this.props.debugHandlers.resizeDebugHandler) {
                var itemRect = layoutManager.getLayouts()[index];
                _this.props.debugHandlers.resizeDebugHandler.resizeDebug({
                    width: itemRect.width,
                    height: itemRect.height,
                }, dim, index);
            }
            // Add extra protection for overrideLayout as it can only be called when non-deterministic rendering is used.
            if (_this.props.forceNonDeterministicRendering && !_this._autoLayout && layoutManager.overrideLayout(index, dim)) {
                if (_this._relayoutReqIndex === -1) {
                    _this._relayoutReqIndex = index;
                }
                else {
                    _this._relayoutReqIndex = Math.min(_this._relayoutReqIndex, index);
                }
                _this._queueStateRefresh();
            }
        };
        _this._onScroll = function (offsetX, offsetY, rawEvent) {
            var _a, _b;
            (_b = (_a = _this.props).onScroll) === null || _b === void 0 ? void 0 : _b.call(_a, rawEvent, offsetX, offsetY);
            _this._onScrollEvent(offsetX, offsetY, rawEvent);
        };
        _this._onScrollBeginDrag = function (offsetX, offsetY, rawEvent) {
            var _a, _b;
            (_b = (_a = _this.props).onScrollBeginDrag) === null || _b === void 0 ? void 0 : _b.call(_a, rawEvent);
            _this._isUserScrolling = true;
            // halts holding indexes (used to implement scrollTo) on user interaction;
            // upon user interaction, scrollTo will have no way to complete naturally
            if (_this._holdTimer !== undefined) {
                clearInterval(_this._holdTimer);
                _this._holdTimer = undefined;
                //Cannot be null here
                var layoutManager = _this._virtualRenderer.getLayoutManager();
                layoutManager.unholdPreservedIndex();
            }
            _this._onScrollEvent(offsetX, offsetY, rawEvent);
        };
        _this._onScrollEndDrag = function (offsetX, offsetY, rawEvent) {
            var _a, _b;
            (_b = (_a = _this.props).onScrollEndDrag) === null || _b === void 0 ? void 0 : _b.call(_a, rawEvent);
            _this._isUserScrolling = false;
            _this._onScrollEvent(offsetX, offsetY, rawEvent);
        };
        _this._onMomentumScrollBegin = function (offsetX, offsetY, rawEvent) {
            var _a, _b;
            (_b = (_a = _this.props).onMomentumScrollBegin) === null || _b === void 0 ? void 0 : _b.call(_a, rawEvent);
            _this._isMomentumScrolling = true;
            _this._onScrollEvent(offsetX, offsetY, rawEvent);
        };
        _this._onMomentumScrollEnd = function (offsetX, offsetY, rawEvent) {
            var _a, _b;
            (_b = (_a = _this.props).onMomentumScrollEnd) === null || _b === void 0 ? void 0 : _b.call(_a, rawEvent);
            _this._isMomentumScrolling = false;
            _this._onScrollEvent(offsetX, offsetY, rawEvent);
        };
        _this._onScrollEvent = function (offsetX, offsetY, rawEvent) {
            var nativeEvent = rawEvent.nativeEvent;
            var contentHeight;
            var layoutHeight;
            if (nativeEvent) {
                var contentSize = nativeEvent.contentSize, layoutMeasurement = nativeEvent.layoutMeasurement;
                if (contentSize) {
                    contentHeight = contentSize.height;
                }
                if (layoutMeasurement) {
                    layoutHeight = layoutMeasurement.height;
                }
            }
            _this._scrollUpdate(offsetX, offsetY, contentHeight, layoutHeight);
        };
        _this._scrollUpdate = throttle(function (offsetX, offsetY, contentHeight, layoutHeight) {
            // correction to be positive to shift offset upwards; negative to push offset downwards.
            // extracting the correction value from logical offset and updating offset of virtual renderer.
            _this._virtualRenderer.updateOffset(offsetX, offsetY, true, _this._getWindowCorrection(offsetX, offsetY, _this.props));
            _this._processOnEndReached();
            _this._scrollOffset = _this.props.isHorizontal ? offsetX : offsetY;
            var layoutManager = _this._virtualRenderer.getLayoutManager();
            var layouts = layoutManager === null || layoutManager === void 0 ? void 0 : layoutManager.getLayouts();
            if (layouts && layouts.length && (contentHeight !== undefined) && (layoutHeight !== undefined)) {
                var firstLayout = layouts[0];
                var lastLayout = layouts[layouts.length - 1];
                _this._scrollHeight = contentHeight;
                var minY = Math.max(0, firstLayout.y) + _this._edgeVisibleThreshold;
                var maxY = Math.min(lastLayout.y + lastLayout.height, contentHeight) - layoutHeight - _this._edgeVisibleThreshold;
                var isEdgeVisible = offsetY < minY || offsetY > maxY;
                _this._isEdgeVisible = isEdgeVisible;
                if (isEdgeVisible) {
                    // Give a little time (for low-end devices) such that all scroll events have fired
                    setTimeout(function () {
                        _this._queueLayoutRefix.flush();
                    }, 100);
                }
            }
            _this._queueLayoutRefix();
        }, 6);
        _this._onAutoLayout = _this.props.nonDeterministicMode === "autolayout" ? function (rawEvent) {
            var autoLayoutId = rawEvent.nativeEvent.autoLayoutId;
            var offsetsStale = _this._autoLayoutId !== autoLayoutId;
            var offsetsValid = (!offsetsStale ||
                (_this._autoLayoutId >= _this._baseAutoLayoutId ? (_this._autoLayoutId > autoLayoutId && autoLayoutId >= _this._baseAutoLayoutId) : (_this._autoLayoutId > autoLayoutId || autoLayoutId >= _this._baseAutoLayoutId)));
            if (offsetsValid) {
                // cannot be null here
                var layoutManager = _this._virtualRenderer.getLayoutManager();
                var renderedLayouts = rawEvent.nativeEvent;
                var relayoutIndex = layoutManager.overrideLayouts(renderedLayouts, offsetsStale);
                if (!offsetsStale) {
                    _this._pendingAutoLayout = false;
                    if (_this._pendingScroll) {
                        setTimeout(function () {
                            if (_this._pendingScroll) {
                                var executable = _this._pendingScroll;
                                _this._pendingScroll = undefined;
                                executable();
                            }
                        }, 0);
                    }
                }
                if (relayoutIndex > -1) {
                    if (_this._relayoutReqIndex === -1) {
                        _this._relayoutReqIndex = relayoutIndex;
                    }
                    else {
                        _this._relayoutReqIndex = Math.min(_this._relayoutReqIndex, relayoutIndex);
                    }
                    _this._queueStateRefresh();
                }
            }
        } : undefined;
        _this._queueLayoutRefix = debounce(function () {
            if (_this._isMounted) {
                var layoutManager = _this._virtualRenderer.getLayoutManager();
                var viewabilityTracker = _this._virtualRenderer.getViewabilityTracker();
                var dataProviderSize = _this.props.dataProvider.getSize();
                var _a = _this, _scrollOffset = _a._scrollOffset, _scrollHeight = _a._scrollHeight, _scrollComponent_1 = _a._scrollComponent, _innerScrollComponent_1 = _a._innerScrollComponent;
                if (layoutManager && viewabilityTracker && _scrollHeight && _scrollComponent_1 && _innerScrollComponent_1) {
                    // if we refix when an auto layout is pending, we may cause a relayout that conflicts with the atuolayout rendered positions
                    // if we refix while holding indexes, relevant offsets will become inaccurate. indexes are held while u scroll to a presumed
                    // offset is happening, and offset shifts will break assumptions of the scroll destination
                    // if the user is scrolling, similarly, we avoid shifting layouts, unless the user is at the edge
                    if (_this._pendingAutoLayout ||
                        layoutManager.isHoldingIndex() ||
                        (!_this._isEdgeVisible && (_this._isUserScrolling || _this._isMomentumScrolling))) {
                        _this._queueLayoutRefix();
                        setTimeout(function () {
                            if (_this._isEdgeVisible) {
                                _this._queueLayoutRefix.flush();
                            }
                        }, 100);
                    }
                    else {
                        var indexes = [];
                        for (var key in _this.state.renderStack) {
                            if (_this.state.renderStack.hasOwnProperty(key)) {
                                indexes.push(_this.state.renderStack[key].dataIndex);
                            }
                        }
                        layoutManager.refix(_this._virtualRenderer, _innerScrollComponent_1, indexes, dataProviderSize, _scrollOffset, function (scrollOffset) {
                            _scrollComponent_1.scrollTo(0, scrollOffset, false);
                            _this._scrollOffset = scrollOffset;
                            _this._scrollUpdate.cancel();
                        }, _scrollHeight, function (scrollHeight) {
                            _this._scrollHeight = scrollHeight;
                        }, function () {
                            if (_this._autoLayout) {
                                _this._pendingAutoLayout = true;
                                _this._autoLayoutId = (_this._autoLayoutId + 1) & 0x7FFFFFFF;
                                if (_this._autoLayoutId === _this._baseAutoLayoutId) {
                                    _this._baseAutoLayoutId = (_this._baseAutoLayoutId ^ 0x40000000) & 0x7FFFFFFF;
                                }
                                _innerScrollComponent_1.setNativeProps({ autoLayoutId: _this._autoLayoutId });
                            }
                        }, function () {
                            _this._queueLayoutRefix();
                            if (_this._isEdgeVisible) {
                                setTimeout(function () {
                                    _this._queueLayoutRefix.flush();
                                }, 100);
                            }
                        });
                    }
                }
            }
            // scroll events appear to be infreuqent and far between during quick momentum scrolls; we cannot set this too small, 
            // or risk interrupting such scrolls
        }, 1500);
        if (props.edgeVisibleThreshold !== undefined) {
            _this._edgeVisibleThreshold = props.edgeVisibleThreshold;
        }
        if (props.nonDeterministicMode !== undefined) {
            _this._autoLayout = props.nonDeterministicMode === "autolayout";
        }
        _this._virtualRenderer = new VirtualRenderer_1.default(_this._renderStackWhenReady, function (offset) {
            _this._pendingScrollToOffset = offset;
        }, function (index) {
            return _this.props.dataProvider.getStableId(index);
        }, !props.disableRecycling, !!props.preserveVisiblePosition, !!props.startEdgePreserved, _this._edgeVisibleThreshold, (props.shiftPreservedLayouts === undefined) || props.shiftPreservedLayouts);
        if (_this.props.windowCorrectionConfig) {
            var windowCorrection = void 0;
            if (_this.props.windowCorrectionConfig.value) {
                windowCorrection = _this.props.windowCorrectionConfig.value;
            }
            else {
                windowCorrection = { startCorrection: 0, endCorrection: 0, windowShift: 0 };
            }
            _this._windowCorrectionConfig = {
                applyToItemScroll: !!_this.props.windowCorrectionConfig.applyToItemScroll,
                applyToInitialOffset: !!_this.props.windowCorrectionConfig.applyToInitialOffset,
                value: windowCorrection,
            };
        }
        else {
            _this._windowCorrectionConfig = {
                applyToItemScroll: false,
                applyToInitialOffset: false,
                value: { startCorrection: 0, endCorrection: 0, windowShift: 0 },
            };
        }
        _this._getContextFromContextProvider(props);
        if (props.layoutSize) {
            _this._layout.height = props.layoutSize.height;
            _this._layout.width = props.layoutSize.width;
            _this._initComplete = true;
            _this._initTrackers(props);
        }
        else {
            _this.state = {
                internalSnapshot: {},
                renderStack: {},
            };
        }
        return _this;
    }
    RecyclerListView.prototype.componentWillReceivePropsCompat = function (newProps) {
        this._assertDependencyPresence(newProps);
        this._checkAndChangeLayouts(newProps);
        if (!newProps.onVisibleIndicesChanged) {
            this._virtualRenderer.removeVisibleItemsListener();
        }
        if (newProps.onVisibleIndexesChanged) {
            throw new CustomError_1.default(RecyclerListViewExceptions_1.default.usingOldVisibleIndexesChangedParam);
        }
        if (newProps.onVisibleIndicesChanged) {
            this._virtualRenderer.attachVisibleItemsListener(newProps.onVisibleIndicesChanged);
        }
    };
    RecyclerListView.prototype.componentDidUpdate = function () {
        this._processInitialOffset();
        this._processOnEndReached();
        this._checkAndChangeLayouts(this.props);
        this._virtualRenderer.setOptimizeForAnimations(false);
    };
    RecyclerListView.prototype.componentDidMount = function () {
        if (this._initComplete) {
            this._processInitialOffset();
            this._processOnEndReached();
        }
    };
    RecyclerListView.prototype.componentWillUnmount = function () {
        this._isMounted = false;
        if (this.props.contextProvider) {
            var uniqueKey = this.props.contextProvider.getUniqueKey();
            if (uniqueKey) {
                this.props.contextProvider.save(uniqueKey + Constants_1.Constants.CONTEXT_PROVIDER_OFFSET_KEY_SUFFIX, this.getCurrentScrollOffset());
                if (this.props.forceNonDeterministicRendering) {
                    if (this._virtualRenderer) {
                        var layoutManager = this._virtualRenderer.getLayoutManager();
                        if (layoutManager) {
                            var layoutsToCache = layoutManager.getLayouts();
                            this.props.contextProvider.save(uniqueKey + Constants_1.Constants.CONTEXT_PROVIDER_LAYOUT_KEY_SUFFIX, JSON.stringify({ layoutArray: layoutsToCache }));
                        }
                    }
                }
            }
        }
    };
    RecyclerListView.prototype.scrollToIndex = function (index, animate) {
        var layoutManager = this._virtualRenderer.getLayoutManager();
        if (layoutManager) {
            var offsets = layoutManager.getOffsetForIndex(index);
            var getScrollCoords = function () { return layoutManager.getOffsetForIndex(index); };
            this.scrollToOffset(offsets.x, offsets.y, animate, this._windowCorrectionConfig.applyToItemScroll, index, getScrollCoords);
        }
        else {
            console.warn(Messages_1.Messages.WARN_SCROLL_TO_INDEX); //tslint:disable-line
        }
    };
    /**
     * This API is almost similar to scrollToIndex, but differs when the view is already in viewport.
     * Instead of bringing the view to the top of the viewport, it will calculate the overflow of the @param index
     * and scroll to just bring the entire view to viewport.
     */
    RecyclerListView.prototype.bringToFocus = function (index, animate) {
        var _this = this;
        var getScrollCoords = function () {
            var listSize = _this.getRenderedSize();
            var itemLayout = _this.getLayout(index);
            var currentScrollOffset = _this.getCurrentScrollOffset() + _this._windowCorrectionConfig.value.windowShift;
            var isHorizontal = _this.props.isHorizontal;
            if (itemLayout) {
                var offset = void 0;
                var mainAxisLayoutDimen = isHorizontal ? itemLayout.width : itemLayout.height;
                var mainAxisLayoutPos = isHorizontal ? itemLayout.x : itemLayout.y;
                var mainAxisListDimen = isHorizontal ? listSize.width : listSize.height;
                var screenEndPos = mainAxisListDimen + currentScrollOffset;
                if (mainAxisLayoutDimen > mainAxisListDimen || mainAxisLayoutPos < currentScrollOffset || mainAxisLayoutPos > screenEndPos) {
                    offset = mainAxisLayoutPos;
                }
                else {
                    var viewEndPos = mainAxisLayoutPos + mainAxisLayoutDimen;
                    if (viewEndPos > screenEndPos) {
                        offset = viewEndPos - screenEndPos;
                    }
                }
                if (offset !== undefined) {
                    return { x: offset, y: offset };
                }
            }
            return;
        };
        var coords = getScrollCoords();
        if (coords) {
            this.scrollToOffset(coords.x, coords.y, animate, true, index, getScrollCoords);
        }
    };
    RecyclerListView.prototype.scrollToItem = function (data, animate) {
        var count = this.props.dataProvider.getSize();
        for (var i = 0; i < count; i++) {
            if (this.props.dataProvider.getDataForIndex(i) === data) {
                this.scrollToIndex(i, animate);
                break;
            }
        }
    };
    RecyclerListView.prototype.getLayout = function (index) {
        var layoutManager = this._virtualRenderer.getLayoutManager();
        return layoutManager ? layoutManager.getLayouts()[index] : undefined;
    };
    RecyclerListView.prototype.scrollToTop = function (animate) {
        this.scrollToIndex(0, animate);
    };
    RecyclerListView.prototype.scrollToEnd = function (animate) {
        var lastIndex = this.props.dataProvider.getSize() - 1;
        this.scrollToIndex(lastIndex, animate);
    };
    // You can use requestAnimationFrame callback to change renderAhead in multiple frames to enable advanced progressive
    // rendering when view types are very complex. This method returns a boolean saying if the update was committed. Retry in
    // the next frame if you get a failure (if mount wasn't complete). Value should be greater than or equal to 0;
    // Very useful when you have a page where you need a large renderAheadOffset. Setting it at once will slow down the load and
    // this will help mitigate that.
    RecyclerListView.prototype.updateRenderAheadOffset = function (renderAheadOffset) {
        var viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        if (viewabilityTracker) {
            viewabilityTracker.updateRenderAheadOffset(renderAheadOffset);
            return true;
        }
        return false;
    };
    RecyclerListView.prototype.getCurrentRenderAheadOffset = function () {
        var viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        if (viewabilityTracker) {
            return viewabilityTracker.getCurrentRenderAheadOffset();
        }
        return this.props.renderAheadOffset;
    };
    RecyclerListView.prototype.getCurrentScrollOffset = function () {
        var viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        return viewabilityTracker ? viewabilityTracker.getLastActualOffset() : 0;
    };
    RecyclerListView.prototype.findApproxFirstVisibleIndex = function () {
        var viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        return viewabilityTracker ? viewabilityTracker.findFirstLogicallyVisibleIndex() : 0;
    };
    RecyclerListView.prototype.getRenderedSize = function () {
        return this._layout;
    };
    RecyclerListView.prototype.getContentDimension = function () {
        return this._virtualRenderer.getLayoutDimension();
    };
    // Force Rerender forcefully to update view renderer. Use this in rare circumstances
    RecyclerListView.prototype.forceRerender = function () {
        this.setState({
            internalSnapshot: {},
        });
    };
    RecyclerListView.prototype.getScrollableNode = function () {
        if (this._scrollComponent && this._scrollComponent.getScrollableNode) {
            return this._scrollComponent.getScrollableNode();
        }
        return null;
    };
    RecyclerListView.prototype.renderCompat = function () {
        //TODO:Talha
        // const {
        //     layoutProvider,
        //     dataProvider,
        //     contextProvider,
        //     renderAheadOffset,
        //     onEndReached,
        //     onEndReachedThreshold,
        //     onVisibleIndicesChanged,
        //     initialOffset,
        //     initialRenderIndex,
        //     disableRecycling,
        //     forceNonDeterministicRendering,
        //     extendedState,
        //     itemAnimator,
        //     rowRenderer,
        //     ...props,
        // } = this.props;
        var _this = this;
        var layoutManager = this._virtualRenderer.getLayoutManager();
        // preserveVisiblePosition mechanisms and especially the refix mechanism relies on prompt scroll events,
        // and also on the latest update to be accurate. this neccesitates listening to the drag and momentum
        // scroll events.
        return (React.createElement(ScrollComponent_1.default, __assign({ ref: function (scrollComponent) { if (scrollComponent) {
                _this._scrollComponent = scrollComponent;
            } }, innerRef: function (innerScrollComponent) { if (innerScrollComponent) {
                _this._innerScrollComponent = innerScrollComponent;
            } } }, this.props, this.props.scrollViewProps, { scrollOffset: this._scrollOffset, preservedIndex: layoutManager ? layoutManager.preservedIndex() : -1, autoLayoutId: this._autoLayoutId, scrollThrottle: 16, onScroll: this._onScroll, onScrollBeginDrag: this._onScrollBeginDrag, onScrollEndDrag: this._onScrollEndDrag, onMomentumScrollBegin: this._onMomentumScrollBegin, onMomentumScrollEnd: this._onMomentumScrollEnd, onSizeChanged: this._onSizeChanged, onAutoLayout: this._onAutoLayout, contentHeight: this._initComplete ? this._virtualRenderer.getLayoutDimension().height : 0, contentWidth: this._initComplete ? this._virtualRenderer.getLayoutDimension().width : 0, renderAheadOffset: this.getCurrentRenderAheadOffset() }), this._generateRenderStack()));
    };
    // Disables recycling for the next frame so that layout animations run well.
    // WARNING: Avoid this when making large changes to the data as the list might draw too much to run animations. Single item insertions/deletions
    // should be good. With recycling paused the list cannot do much optimization.
    // The next render will run as normal and reuse items.
    RecyclerListView.prototype.prepareForLayoutAnimationRender = function () {
        this._virtualRenderer.setOptimizeForAnimations(true);
    };
    RecyclerListView.prototype.getVirtualRenderer = function () {
        return this._virtualRenderer;
    };
    RecyclerListView.prototype.onItemLayout = function (index) {
        if (this.props.onItemLayout) {
            this.props.onItemLayout(index);
        }
    };
    RecyclerListView.prototype._processInitialOffset = function () {
        var _this = this;
        if (this._pendingScrollToOffset) {
            setTimeout(function () {
                if (_this._pendingScrollToOffset) {
                    var offset = _this._pendingScrollToOffset;
                    _this._pendingScrollToOffset = null;
                    if (_this.props.isHorizontal) {
                        offset.y = 0;
                    }
                    else {
                        offset.x = 0;
                    }
                    _this.scrollToOffset(offset.x, offset.y, false, _this._windowCorrectionConfig.applyToInitialOffset);
                    if (_this._pendingRenderStack) {
                        _this._renderStackWhenReady(_this._pendingRenderStack);
                        _this._pendingRenderStack = undefined;
                    }
                }
            }, 0);
        }
    };
    RecyclerListView.prototype._getContextFromContextProvider = function (props) {
        if (props.contextProvider) {
            var uniqueKey = props.contextProvider.getUniqueKey();
            if (uniqueKey) {
                var offset = props.contextProvider.get(uniqueKey + Constants_1.Constants.CONTEXT_PROVIDER_OFFSET_KEY_SUFFIX);
                if (typeof offset === "number" && offset > 0) {
                    this._initialOffset = offset;
                    if (props.onRecreate) {
                        props.onRecreate({ lastOffset: this._initialOffset });
                    }
                    props.contextProvider.remove(uniqueKey + Constants_1.Constants.CONTEXT_PROVIDER_OFFSET_KEY_SUFFIX);
                }
                if (props.forceNonDeterministicRendering) {
                    var cachedLayouts = props.contextProvider.get(uniqueKey + Constants_1.Constants.CONTEXT_PROVIDER_LAYOUT_KEY_SUFFIX);
                    if (cachedLayouts && typeof cachedLayouts === "string") {
                        this._cachedLayouts = JSON.parse(cachedLayouts).layoutArray;
                        props.contextProvider.remove(uniqueKey + Constants_1.Constants.CONTEXT_PROVIDER_LAYOUT_KEY_SUFFIX);
                    }
                }
            }
        }
    };
    RecyclerListView.prototype._checkAndChangeLayouts = function (newProps, forceFullRender) {
        this._params.isHorizontal = newProps.isHorizontal;
        this._params.itemCount = newProps.dataProvider.getSize();
        this._virtualRenderer.setParamsAndDimensions(this._params, this._layout);
        this._virtualRenderer.setLayoutProvider(newProps.layoutProvider);
        if (newProps.dataProvider.hasStableIds() && this.props.dataProvider !== newProps.dataProvider) {
            if (newProps.dataProvider.requiresDataChangeHandling()) {
                this._virtualRenderer.handleDataSetChange(newProps.dataProvider, this._scrollOffset, this._holdStableId);
                this._autoLayoutId = (this._autoLayoutId + 1) & 0x7FFFFFFF;
                this._baseAutoLayoutId = this._autoLayoutId;
            }
            else if (this._virtualRenderer.hasPendingAnimationOptimization()) {
                console.warn(Messages_1.Messages.ANIMATION_ON_PAGINATION); //tslint:disable-line
            }
        }
        if (this.props.layoutProvider !== newProps.layoutProvider || this.props.isHorizontal !== newProps.isHorizontal) {
            //TODO:Talha use old layout manager
            this._virtualRenderer.setLayoutManager(newProps.layoutProvider.createLayoutManager(this._layout, newProps.isHorizontal));
            if (newProps.layoutProvider.shouldRefreshWithAnchoring) {
                this._virtualRenderer.refreshWithAnchor();
            }
            else {
                this._virtualRenderer.refresh();
            }
            this._refreshViewability();
        }
        else if (this.props.dataProvider !== newProps.dataProvider) {
            if (newProps.dataProvider.getSize() > this.props.dataProvider.getSize()) {
                this._onEndReachedCalled = false;
            }
            var layoutManager = this._virtualRenderer.getLayoutManager();
            if (layoutManager) {
                layoutManager.relayoutFromIndex(newProps.dataProvider.getFirstIndexToProcessInternal(), newProps.dataProvider.getSize());
                if (this._autoLayout) {
                    this._pendingAutoLayout = true;
                }
                this._virtualRenderer.refresh();
                this._queueLayoutRefix();
            }
        }
        else if (forceFullRender) {
            var layoutManager = this._virtualRenderer.getLayoutManager();
            if (layoutManager) {
                var cachedLayouts = layoutManager.getLayouts();
                this._virtualRenderer.setLayoutManager(newProps.layoutProvider.createLayoutManager(this._layout, newProps.isHorizontal, cachedLayouts));
                this._refreshViewability();
                this._queueLayoutRefix();
            }
        }
        else if (this._relayoutReqIndex >= 0) {
            var layoutManager = this._virtualRenderer.getLayoutManager();
            if (layoutManager) {
                var dataProviderSize = newProps.dataProvider.getSize();
                layoutManager.relayoutFromIndex(Math.min(Math.max(dataProviderSize - 1, 0), this._relayoutReqIndex), dataProviderSize);
                if (this._autoLayout) {
                    this._pendingAutoLayout = true;
                }
                this._relayoutReqIndex = -1;
                this._refreshViewability();
                this._queueLayoutRefix();
            }
        }
    };
    RecyclerListView.prototype._refreshViewability = function () {
        this._virtualRenderer.refresh();
        this._queueStateRefresh();
    };
    RecyclerListView.prototype._queueStateRefresh = function () {
        var _this = this;
        this.refreshRequestDebouncer(function () {
            if (_this._isMounted) {
                _this.setState(function (prevState) {
                    return prevState;
                });
            }
        });
    };
    RecyclerListView.prototype._initStateIfRequired = function (stack) {
        if (!this.state) {
            this.state = {
                internalSnapshot: {},
                renderStack: stack,
            };
            return true;
        }
        return false;
    };
    RecyclerListView.prototype._initTrackers = function (props) {
        this._assertDependencyPresence(props);
        if (props.onVisibleIndexesChanged) {
            throw new CustomError_1.default(RecyclerListViewExceptions_1.default.usingOldVisibleIndexesChangedParam);
        }
        if (props.onVisibleIndicesChanged) {
            this._virtualRenderer.attachVisibleItemsListener(props.onVisibleIndicesChanged);
        }
        this._params = {
            initialOffset: this._initialOffset ? this._initialOffset : props.initialOffset,
            initialRenderIndex: props.initialRenderIndex,
            isHorizontal: props.isHorizontal,
            itemCount: props.dataProvider.getSize(),
            renderAheadOffset: props.renderAheadOffset,
        };
        this._virtualRenderer.setParamsAndDimensions(this._params, this._layout);
        var layoutManager = props.layoutProvider.createLayoutManager(this._layout, props.isHorizontal, this._cachedLayouts);
        this._virtualRenderer.setLayoutManager(layoutManager);
        this._virtualRenderer.setLayoutProvider(props.layoutProvider);
        this._virtualRenderer.init();
        var offset = this._virtualRenderer.getInitialOffset();
        var contentDimension = layoutManager.getContentDimension();
        if ((offset.y > 0 && contentDimension.height > this._layout.height) ||
            (offset.x > 0 && contentDimension.width > this._layout.width)) {
            this._pendingScrollToOffset = offset;
            if (!this._initStateIfRequired()) {
                this.setState({});
            }
        }
        else {
            this._virtualRenderer.startViewabilityTracker(this._getWindowCorrection(offset.x, offset.y, props));
        }
    };
    RecyclerListView.prototype._getWindowCorrection = function (offsetX, offsetY, props) {
        return (props.applyWindowCorrection && props.applyWindowCorrection(offsetX, offsetY, this._windowCorrectionConfig.value))
            || this._windowCorrectionConfig.value;
    };
    RecyclerListView.prototype._assertDependencyPresence = function (props) {
        if (!props.dataProvider || !props.layoutProvider) {
            throw new CustomError_1.default(RecyclerListViewExceptions_1.default.unresolvedDependenciesException);
        }
    };
    RecyclerListView.prototype._assertType = function (type) {
        if (!type && type !== 0) {
            throw new CustomError_1.default(RecyclerListViewExceptions_1.default.itemTypeNullException);
        }
    };
    RecyclerListView.prototype._renderRowUsingMeta = function (itemMeta) {
        var dataSize = this.props.dataProvider.getSize();
        var dataIndex = itemMeta.dataIndex;
        if (!ts_object_utils_1.ObjectUtil.isNullOrUndefined(dataIndex) && dataIndex < dataSize) {
            var itemRect = this._virtualRenderer.getLayoutManager().getLayouts()[dataIndex];
            var data = this.props.dataProvider.getDataForIndex(dataIndex);
            var type = this.props.layoutProvider.getLayoutTypeForIndex(dataIndex);
            var key = this._virtualRenderer.syncAndGetKey(dataIndex);
            var styleOverrides = this._virtualRenderer.getLayoutManager().getStyleOverridesForIndex(dataIndex);
            this._assertType(type);
            if (!this.props.forceNonDeterministicRendering) {
                this._checkExpectedDimensionDiscrepancy(itemRect, type, dataIndex);
            }
            return (React.createElement(ViewRenderer_1.default, { key: key, data: data, dataHasChanged: this._dataHasChanged, x: itemRect.x, y: itemRect.y, layoutType: type, index: dataIndex, styleOverrides: styleOverrides, layoutProvider: this.props.layoutProvider, forceNonDeterministicRendering: this.props.forceNonDeterministicRendering, isHorizontal: this.props.isHorizontal, onSizeChanged: this._onViewContainerSizeChange, childRenderer: this.props.rowRenderer, height: itemRect.height, width: itemRect.width, itemAnimator: ts_object_utils_1.Default.value(this.props.itemAnimator, this._defaultItemAnimator), extendedState: this.props.extendedState, internalSnapshot: this.state.internalSnapshot, renderItemContainer: this.props.renderItemContainer, onItemLayout: this._onItemLayout }));
        }
        return null;
    };
    RecyclerListView.prototype._checkExpectedDimensionDiscrepancy = function (itemRect, type, index) {
        if (this.props.layoutProvider.checkDimensionDiscrepancy(itemRect, type, index)) {
            if (this._relayoutReqIndex === -1) {
                this._relayoutReqIndex = index;
            }
            else {
                this._relayoutReqIndex = Math.min(this._relayoutReqIndex, index);
            }
        }
    };
    RecyclerListView.prototype._generateRenderStack = function () {
        var renderedItems = [];
        if (this.state) {
            for (var key in this.state.renderStack) {
                if (this.state.renderStack.hasOwnProperty(key)) {
                    renderedItems.push(this._renderRowUsingMeta(this.state.renderStack[key]));
                }
            }
        }
        return renderedItems;
    };
    RecyclerListView.prototype._processOnEndReached = function () {
        if (this.props.onEndReached && this._virtualRenderer) {
            var layout = this._virtualRenderer.getLayoutDimension();
            var viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
            if (viewabilityTracker) {
                var windowBound = this.props.isHorizontal ? layout.width - this._layout.width : layout.height - this._layout.height;
                var lastOffset = viewabilityTracker ? viewabilityTracker.getLastOffset() : 0;
                var threshold = windowBound - lastOffset;
                var listLength = this.props.isHorizontal ? this._layout.width : this._layout.height;
                var triggerOnEndThresholdRelative = listLength * ts_object_utils_1.Default.value(this.props.onEndReachedThresholdRelative, 0);
                var triggerOnEndThreshold = ts_object_utils_1.Default.value(this.props.onEndReachedThreshold, 0);
                if (threshold <= triggerOnEndThresholdRelative || threshold <= triggerOnEndThreshold) {
                    if (this.props.onEndReached && !this._onEndReachedCalled) {
                        this._onEndReachedCalled = true;
                        this.props.onEndReached();
                    }
                }
                else {
                    this._onEndReachedCalled = false;
                }
            }
        }
    };
    RecyclerListView.defaultProps = {
        canChangeSize: false,
        disableRecycling: false,
        initialOffset: 0,
        initialRenderIndex: 0,
        isHorizontal: false,
        onEndReachedThreshold: 0,
        onEndReachedThresholdRelative: 0,
        renderAheadOffset: IS_WEB ? 1000 : 250,
    };
    RecyclerListView.propTypes = {};
    return RecyclerListView;
}(ComponentCompat_1.ComponentCompat));
exports.default = RecyclerListView;
RecyclerListView.propTypes = {
    //Refer the sample
    layoutProvider: PropTypes.instanceOf(LayoutProvider_1.BaseLayoutProvider).isRequired,
    //Refer the sample
    dataProvider: PropTypes.instanceOf(DataProvider_1.BaseDataProvider).isRequired,
    //Used to maintain scroll position in case view gets destroyed e.g, cases of back navigation
    contextProvider: PropTypes.instanceOf(ContextProvider_1.default),
    //Methods which returns react component to be rendered. You get type of view and data in the callback.
    rowRenderer: PropTypes.func.isRequired,
    //Initial offset you want to start rendering from, very useful if you want to maintain scroll context across pages.
    initialOffset: PropTypes.number,
    //Specify how many pixels in advance do you want views to be rendered. Increasing this value can help reduce blanks (if any). However keeping this as low
    //as possible should be the intent. Higher values also increase re-render compute
    renderAheadOffset: PropTypes.number,
    //Whether the listview is horizontally scrollable. Both use staggeredGrid implementation
    isHorizontal: PropTypes.bool,
    //On scroll callback onScroll(rawEvent, offsetX, offsetY), note you get offsets no need to read scrollTop/scrollLeft
    onScroll: PropTypes.func,
    //callback onRecreate(params), when recreating recycler view from context provider. Gives you the initial params in the first
    //frame itself to allow you to render content accordingly
    onRecreate: PropTypes.func,
    //Provide your own ScrollView Component. The contract for the scroll event should match the native scroll event contract, i.e.
    // scrollEvent = { nativeEvent: { contentOffset: { x: offset, y: offset } } }
    //Note: Please extend BaseScrollView to achieve expected behaviour
    externalScrollView: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
    //Callback given when user scrolls to the end of the list or footer just becomes visible, useful in incremental loading scenarios
    onEndReached: PropTypes.func,
    //Specify how many pixels in advance you onEndReached callback
    onEndReachedThreshold: PropTypes.number,
    //Specify how far from the end (in units of visible length of the list)
    //the bottom edge of the list must be from the end of the content to trigger the onEndReached callback
    onEndReachedThresholdRelative: PropTypes.number,
    //Deprecated. Please use onVisibleIndicesChanged instead.
    onVisibleIndexesChanged: PropTypes.func,
    //Provides visible index, helpful in sending impression events etc, onVisibleIndicesChanged(all, now, notNow)
    onVisibleIndicesChanged: PropTypes.func,
    //Provide this method if you want to render a footer. Helpful in showing a loader while doing incremental loads.
    renderFooter: PropTypes.func,
    //Specify the initial item index you want rendering to start from. Preferred over initialOffset if both are specified.
    initialRenderIndex: PropTypes.number,
    //Specify the estimated size of the recyclerlistview to render the list items in the first pass. If provided, recyclerlistview will
    //use these dimensions to fill in the items in the first render. If not provided, recyclerlistview will first render with no items
    //and then fill in the items based on the size given by its onLayout event. canChangeSize can be set to true to relayout items when
    //the size changes.
    layoutSize: PropTypes.object,
    //iOS only. Scroll throttle duration.
    scrollThrottle: PropTypes.number,
    //Specify if size can change, listview will automatically relayout items. For web, works only with useWindowScroll = true
    canChangeSize: PropTypes.bool,
    //Web only. Layout elements in window instead of a scrollable div.
    useWindowScroll: PropTypes.bool,
    //Turns off recycling. You still get progressive rendering and all other features. Good for lazy rendering. This should not be used in most cases.
    disableRecycling: PropTypes.bool,
    //Default is false, if enabled dimensions provided in layout provider will not be strictly enforced.
    //Rendered dimensions will be used to relayout items. Slower if enabled.
    forceNonDeterministicRendering: PropTypes.bool,
    //In some cases the data passed at row level may not contain all the info that the item depends upon, you can keep all other info
    //outside and pass it down via this prop. Changing this object will cause everything to re-render. Make sure you don't change
    //it often to ensure performance. Re-renders are heavy.
    extendedState: PropTypes.object,
    //Enables animating RecyclerListView item cells e.g, shift, add, remove etc. This prop can be used to pass an external item animation implementation.
    //Look into BaseItemAnimator/DefaultJSItemAnimator/DefaultNativeItemAnimator/DefaultWebItemAnimator for more info.
    //By default there are few animations, to disable completely simply pass blank new BaseItemAnimator() object. Remember, create
    //one object and keep it do not create multiple object of type BaseItemAnimator.
    //Note: You might want to look into DefaultNativeItemAnimator to check an implementation based on LayoutAnimation. By default,
    //animations are JS driven to avoid workflow interference. Also, please note LayoutAnimation is buggy on Android.
    itemAnimator: PropTypes.instanceOf(ItemAnimator_1.BaseItemAnimator),
    // Enables an alternate layout algorithm which is superior when the list has large regions where item heights are not precisely known.
    // The alternate algorithm calculates layouts by assuming that the offset of an item chosen from the visible region is correct and
    // to be fixed at its current position, as opposed to the default algorithm which assumes that the layouts in front of the
    // visible and engaged region is correct and fixed to the start of the scroller. This algorithm works well when the estimated size of 
    // items can be very far off from the correct value. Only vertical layouts with a single column is implemented for preserveVisiblePosition
    // at the moment.
    // Because the preserveVisiblePosition layout algorithm performs layouting by forcibly assuming the positioning of visible
    // items to be correct, this can cause the list to be offset at the edges. This will cause issues when the scroll position is close to edges such
    // that the edge is visible. To correct for this, when the user stops scrolling, or the user moves close to edges, the list will trigger
    // "refix" operations that recalibrates the physical locations of offsets and scroll positions to the correct logical locations. 
    preserveVisiblePosition: PropTypes.bool,
    // This props selects the method of determining rendered layouts with forceNonDeterministicRendering.
    // This should usually be 'normal', which detects rendered layout sizes using the onLayout event from View.
    // If the provided renderContentContainer supports the onAutoLayout event, 'autolayout' can be provided to this prop,
    // so that information from onAutoLayout is used instead. This allows information on all the rendered items to be
    // taken into account, so that it has potential to be faster and should not cause issues due to onLayouts of items arriving
    // at different timings or being dropped. Furthermore, the autolayout mode allows the rendered offset to be taken into account,
    // as opposed to just the heights of items. The preserveVisiblePosition layout algorithm will attempt to cooperate with the 
    // rendered offset from autolayout whenever possible, so that layout shifts due to mismatch between rendered layout and the 
    // logical layout are minimized. If possible, this should be used if the renderContentContainer component performs layouting by itself.
    nonDeterministicMode: PropTypes.oneOf(["autolayout", "normal"]),
    // For controlling edge thresholds for refixing and for preserving positions
    edgeVisibleThreshold: PropTypes.number,
    // For controlling whether visible region should still be preserved even when scroll is near the start of list
    startEdgePreserved: PropTypes.bool,
    // Enables preserving calculated layouts on data changes; suitable if changes are mostly new items at edges, rather than modifications which change sizes of existing items
    shiftPreservedLayouts: PropTypes.bool,
    //All of the Recyclerlistview item cells are enclosed inside this item container. The idea is pass a native UI component which implements a
    //view shifting algorithm to remove the overlaps between the neighbouring views. This is achieved by shifting them by the appropriate
    //amount in the correct direction if the estimated sizes of the item cells are not accurate. If this props is passed, it will be used to
    //enclose the list items and otherwise a default react native View will be used for the same.
    renderContentContainer: PropTypes.func,
    //This container is for wrapping individual cells that are being rendered by recyclerlistview unlike contentContainer which wraps all of them.
    renderItemContainer: PropTypes.func,
    //Deprecated in favour of `prepareForLayoutAnimationRender` method
    optimizeForInsertDeleteAnimations: PropTypes.bool,
    //To pass down style to inner ScrollView
    style: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.number,
    ]),
    //For TS use case, not necessary with JS use.
    //For all props that need to be proxied to inner/external scrollview. Put them in an object and they'll be spread
    //and passed down.
    scrollViewProps: PropTypes.object,
    // Used when the logical offsetY differs from actual offsetY of recyclerlistview, could be because some other component is overlaying the recyclerlistview.
    // For e.x. toolbar within CoordinatorLayout are overlapping the recyclerlistview.
    // This method exposes the windowCorrection object of RecyclerListView, user can modify the values in realtime.
    applyWindowCorrection: PropTypes.func,
    // This can be used to hook an itemLayoutListener to listen to which item at what index is layout.
    // To get the layout params of the item, you can use the ref to call method getLayout(index), e.x. : `this._recyclerRef.getLayout(index)`
    // but there is a catch here, since there might be a pending relayout due to which the queried layout might not be precise.
    // Caution: RLV only listens to layout changes if forceNonDeterministicRendering is true
    onItemLayout: PropTypes.func,
    //Used to specify is window correction config and whether it should be applied to some scroll events
    windowCorrectionConfig: PropTypes.object,
};
//# sourceMappingURL=RecyclerListView.js.map