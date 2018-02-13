// ViewModel 模型

var arrayObserverPrototype = [],
    overrideMethods = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"],
    hasProto = '__proto__' in {},
    updatePrototype;
// 劫持修改数组的API方法
overrideMethods.forEach(function(methodName) {
    var originalMethod = arrayObserverPrototype[methodName];

    arrayObserverPrototype[methodName] = function() {
        var result,
            insertedItems,
            args = arrayObserverPrototype.slice(arguments, 0),
            notice;

        result = originalMethod.apply(this, args);

        switch(methodName) {
            case "push":
            case "unshift":
                insertedItems = args;
                break;
            case "splice":
                insertedItems = args.slice(2);
                break;
        }

        notice = this.__notice__;
        if(insertedItems) {
            notice.arrayNotify(insertedItems);
        }
        notice.dependency.notify();
        return result;
    };
});

if(hasProto) {
    updatePrototype = function(target, prototype, keys) {
        value.__proto__ = prototype;
    };
} else {
    updatePrototype = function(target, prototype, keys) {
        var i, len, key;
        for(i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            target[key] = prototype[key];
        }
    }
}

function defineNotifyProperty(obj, propertyName, val, shallow, path) {
    var descriptor,
        getter,
        setter,
        notice,
        childNotice;

    descriptor = Object.getOwnPropertyDescriptor(obj, propertyName);
    if (descriptor && descriptor.configurable === false) {
        return;
    }

    getter = descriptor.get;
    setter = descriptor.set;

    // 如果深度引用，则将子属性也转换为通知对象
    if(!shallow) {
        childNotice = new NotifyObject(val);
    }

    notice = obj.__notice__;
    Object.defineProperty(obj, propertyName, {
        enumerable: true,
        configurable: true,
        get: function () {
            var oldVal = getter ? getter.call(obj) : val;
            return oldVal;
        },
        set: function(newVal) {
            var oldVal = getter ? getter.call(obj) : val;
            if(oldVal === newVal || (newVal !== newVal && val !== val)) {
                return;
            }

            if(setter) {
                setter.call(obj, newVal);
            } else {
                val = newVal;
            }

            if(!shallow) {
                // 更新通知对象
                childNotice = new NotifyObject(newVal);
            }
            notice.dependency.notify(propertyName);
        }
    });
}

function createNotifyObject(obj) {
    var isObject,
        isArray,
        notice;

    isObject = ui.core.isObject(obj);
    isArray = Array.isArray(obj);

    if(!isObject && !isArray) {
        return obj;
    }
    if(isObject && ui.core.isEmptyObject(obj)) {
        return obj;
    }

    if(Object.hasOwnProperty("__notice__") && obj.__notice__ instanceof NotifyObject) {
        notice = obj.__notice__;
        // TODO notice.count++;
    } else if((isArray || isObject) && Object.isExtensible(obj)) {
        notice = new NotifyObject(obj);
    }

    return obj;
}

/**
function BaseNotifyObject() {
}
NotifyBase.prototype = {
    constructor: NotifyBase,
    addPropertyChanged: function(handler) {

    },
    removePropertyChanged: function(handler) {

    }
};

function NotifyArray(array) {
    this.dependency = new Dependency();
    updatePrototype(array, arrayObserverPrototype, overrideMethods);
    this.arrayNotify(array);
}
NotifyArray.prototype = new BaseNotifyObject();
NotifyArray.prototype.constructor = NotifyArray;
NotifyArray.prototype.wrapArray = function() {
    var i, len;
    for(i = 0, len = array.length; i < len; i++) {
        createNotifyObject(array[i]);
    }
};

function NotifyObject(obj) {
    this._original = obj;
    this.dependency = new Dependency();

}
NotifyObject.prototype = new BaseNotifyObject();
NotifyObject.prototype.constructor = NotifyObject;
NotifyObject.prototype.wrapObject = function(obj) {
    var keys = Object.keys(obj),
        i, len;

    keys = Object.keys(obj);
    for(i = 0, len = keys.length; i < len; i++) {
        defineNotifyProperty(obj, keys[i], obj[keys[i]]);
    }
};
*/

function NotifyObject(obj) {
    this.value = value;
    this.dependency = new Dependency();
    value.__notice__ = this;
    if(Array.isArray(value)) {
        updatePrototype(value, arrayObserverPrototype, overrideMethods);
        this.arrayNotify(value);
    } else {
        this.objectNotify(value);
    }
}
NotifyObject.prototype = {
    constructor: NotifyObject,
    arrayNotify: function(array) {
        var i, len;
        for(i = 0, len = array.length; i < len; i++) {
            createNotifyObject(array[i]);
        }
    },
    objectNotify: function(obj) {
        var keys = Object.keys(obj),
            i, len;

        for(i = 0, len = keys.length; i < len; i++) {
            defineNotifyProperty(obj, keys[i], obj[keys[i]]);
        }
    }
};

// 依赖属性
function Dependency() {
    this.depMap = {};
}
Dependency.prototype = {
    constructor: Dependency,
    // 添加依赖处理
    add: function(binder) {
        if(binder instanceof Binder) {
            
        }
    },
    // 移除依赖处理
    remove: function(item) {

    },
    depend: function() {
    },
    // 变化通知
    notify: function(propertyName) {
        var keys,
            delegate,
            errors,
            i, len;
        if(ui.core.type(propertyName) === "string" && propertyName) {
            if(this.depMap.hasOwnProperty(propertyName)) {
                keys = [propertyName];    
            } else {
                keys = [];
            }
        } else {
            keys = Object.keys(this.depMap);
        }
        errors = [];
        for(i = 0, len = keys.length; i < len; i++) {
            delegate = this.depMap[keys[i]];
            delegate.forEach(function(binder) {
                try {
                    binder.update();
                } catch(e) {
                    errors.push(e);
                }
            });
        }
        if(errors.length > 0) {
            throw errors.toString();
        }
    }
};


// 查看器
function Binder() {
    if(this instanceof Binder) {
        this.initialize();
    } else {
        return new Binder();
    }
}
Binder.prototype = {
    constructor: Binder,
    initialize: funciton() {

    },
    update: function() {

    }
};

ui.ViewModel = createNotifyObject;
ui.ViewModel.bindOnce = function(vm, propertyName, bindData, fn) {
    if(ui.core.isFunction(bindData)) {
        fn = bindData;
        bindData = null;
    }
};
ui.ViewModel.bindOneWay = function(vm, propertyName, bindData, fn) {
    if(ui.core.isFunction(bindData)) {
        fn = bindData;
        bindData = null;
    }
};
