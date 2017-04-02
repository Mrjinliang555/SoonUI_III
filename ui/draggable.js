
var doc = document;
var body = $(doc.body);
var defaultOption = {
    // 拖动的目标
    target: null,
    // 把手，拖拽事件附加的元素
    handle: null,
    // 范围元素，默认是$(body)
    parent: body,
    hasIframe: false,
    // 开始拖拽处理函数
    onBeginDrag: null,
    // 移动处理函数 
    onMoving: null,
    // 结束拖拽处理函数
    onEndDrag: null
};

function MouseDragger(option) {
    if(this instanceof MouseDragger) {
        this.initialize(option);
    } else {
        return new MouseDragger(option);
    }
}
MouseDragger.prototype = {
    initialize: function(option) {
        this.doc = document;
        this.shield = null;

        this.option = $.extend(defaultOption, option);
        if(this.option.hasIframe === true) {
            this.shield = $("<div>");
            this.shield.css({
                "position": "fixed",
                "top": "0px",
                "left": "0px",
                "width": "100%",
                "height": "100%",
                "z-index": "999999",
                "background-color": "#ffffff",
                "filter": "Alpha(opacity=1)",
                "opacity": ".1"    
            });
        }

        this.onMouseDown = $.proxy(this.mouseDownHandler, this);
        this.onMouseMove = $.proxy(this.mouseMoveHandler, this);
        this.onMouseUp = $.proxy(this.mouseUpHandler, this);
    },
    on: function() {
        var target = this.option.target,
            handle = this.option.handle,
            parent = this.option.parent;
        if(!parent.isNodeName("body")) {
            this.option.originParentPosition = parent.css("position");
            if (position !== "absolute" && position !== "relative" && position !== "fixed") {
                parent.css("position", "relative");
            }
        }
        this.option.targetPosition = target.css("position");
        if (this.option.targetPosition !== "absolute") {
            target.css("position", "absolute");
        }

        this.doc.on("mousedown", this, this.onMouseDown);
        if(this.option.target)
            this.option.target.data("mouse-dragger", this);
    },
    off: function() {
        this.option.target
            .off("mousedown", this.onMouseDown)
            .css("position", this.option.originPosition);
        this.option.parent.css("position", this.option.originParentPosition);
    },
    mouseDownHandler: function(e) {
        var eventArg = {};
        if (e.which !== 1) return;

        eventArg.currentX = this.currentX = e.pageX;
        eventArg.currentY = this.currentY = e.pageY;

        if(ui.core.isFunction(this.option.onBeginDrag)) {
            this.option.onBeginDrag.call(this, eventArg);
        }
        doc.on("mousemove", this.onMouseMove)
            .on("mouseup", this.onMouseUp)
            .on("mouseleave", this.onMouseUp);
        doc.onselectstart = function() { return false; };
        /*
            .cancel-user-select {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;    
            }
         */
        this.option.target.addClass("cancel-user-select");
        this._isDragStart = true;

        if(this.shield) {
            body.append(this.shield);
        }
    },
    mouseMoveHandler: function(e) {
        var eventArg = {};
        if(!this._isDragStart) return;
        
        eventArg.x = e.pageX - this.currentX;
        eventArg.y = e.pageY - this.currentY;
        eventArg.currentX = this.currentX = e.pageX;
        eventArg.currentY = this.currentY = e.pageY;

        if(ui.core.isFunction(this.option.onMoving)) {
            this.option.onMoving.call(this, eventArg);
        }
    },
    mouseUpHandler: function(e) {
        var eventArg = {};
        if (e.which !== 1) return;
        if(!this._isDragStart) return;

        this._isDragStart = false;
        this.currentX = this.currentY = null;

        doc.onselectstart = null;
        this.option.target.removeClass("cancel-user-select");

        if(ui.core.isFunction(this.option.onEndDrag)) {
            this.option.onEndDrag.call(this, eventArg);
        }

        if(this.shield) {
            this.shield.remove();
        }
    }
};

ui.MouseDragger = MouseDragger;
$.fn.draggable = function(option) {
    var dragger;
    if (!option || !option.target || !option.parent) {
        return;
    }
    if (!core.isDomObject(this[0]) || elem.nodeName() === "BODY") {
        return;
    }

    option.getParentCssNum = function(prop) {
        return parseFloat(option.parent.css(prop)) || 0;
    };
    option.onBeginDrag = function(arg) {
        var option = this.option;
            p = option.parent.offset();
        if(!p) p = { top: 0, left: 0 };

        option.topLimit = p.top + option.getParentCssNum("border-top") + option.getParentCssNum("padding-top");
        option.leftLimit = p.left + option.getParentCssNum("border-left") + option.getParentCssNum("padding-left");
        option.rightLimit = p.left + (option.parent.outerWidth() || option.parent.width());
        option.bottomLimit = p.top + (option.parent.outerHeight() || option.parent.height());
        
        option.targetWidth = option.target.outerWidth();
        option.targetHeight = option.target.outerHeight();
    };
    option.onMoving = function(arg) {
        var option = this.option,
            p = option.target.position();
        p.top += arg.y;
        p.left += arg.x;

        if (p.top < option.topLimit) {
            p.top = option.topLimit;
        } else if (p.top + option.targetHeight > option.bottomLimit) {
            p.top = option.bottomLimit - option.targetHeight;
        }
        if (p.left < option.leftLimit) {
            p.left = option.leftLimit;
        } else if (p.left + option.targetWidth > option.rightLimit) {
            p.left = option.rightLimit - option.targetWidth;
        }

        option.target.css({
            "top": p.top + "px",
            "left": p.left + "px"
        });
    };

    dragger = ui.MouseDragger(option);
    dragger.on();

    return this;
};
$.fn.undraggable = function() {
    var dragger;
    if(this.length === 0)
        return;
    dragger = this.data("mouse-dragger");
    if(dragger && dragger instanceof MouseDragger) {
        dragger.off();
    }
};