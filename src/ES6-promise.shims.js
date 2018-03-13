// promise

//chrome36的原生Promise还多了一个defer()静态方法，允许不通过传参就能生成Promise实例，
//另还多了一个chain(onSuccess, onFail)原型方法，意义不明
//目前，firefox24, opera19也支持原生Promise(chrome32就支持了，但需要打开开关，自36起直接可用)
//本模块提供的Promise完整实现ECMA262v6 的Promise规范
function ok(val) {
    return val;
}
function ng(e) {
    throw e;
}

function done(onSuccess) {
    //添加成功回调
    return this.then(onSuccess, ng);
}
function fail(onFail) {
    //添加出错回调
    return this.then(ok, onFail);
}
function defer() {
    var ret = {};
    ret.promise = new this(function (resolve, reject) {
        ret.resolve = resolve;
        ret.reject = reject;
    });
    return ret;
}

var uiPromise = function (executor) {
    this._callbacks = [];
    var me = this;
    if (typeof this !== "object")
        throw new Error("Promises must be constructed via new");
    if (typeof executor !== "function")
        throw new Error("not a function");

    executor(function (value) {
        _resolve(me, value);
    }, function (reason) {
        _reject(me, reason);
    });
};
//返回一个已经处于`resolved`状态的Promise对象
uiPromise.resolve = function (value) {
    return new uiPromise(function (resolve) {
        resolve(value);
    });
};
//返回一个已经处于`rejected`状态的Promise对象
uiPromise.reject = function (reason) {
    return new uiPromise(function (resolve, reject) {
        reject(reason);
    });
};

uiPromise.prototype = {
    //一个Promise对象一共有3个状态：
    //- `pending`：还处在等待状态，并没有明确最终结果
    //- `resolved`：任务已经完成，处在成功状态
    //- `rejected`：任务已经完成，处在失败状态
    constructor: uiPromise,
    _state: "pending",
    _fired: false, //判定是否已经被触发
    _fire: function (onSuccess, onFail) {
        if (this._state === "rejected") {
            if (typeof onFail === "function") {
                onFail(this._value);
            } else {
                throw this._value;
            }
        } else {
            if (typeof onSuccess === "function") {
                onSuccess(this._value);
            }
        }
    },
    _then: function (onSuccess, onFail) {
        var self;
        if (this._fired) {//在已有Promise上添加回调
            self = this;
            setTimeout(function() {
                self._fire(onSuccess, onFail);
            }, 0);
        } else {
            this._callbacks.push({onSuccess: onSuccess, onFail: onFail});
        }
    },
    then: function (onSuccess, onFail) {
        onSuccess = typeof onSuccess === "function" ? onSuccess : ok;
        onFail = typeof onFail === "function" ? onFail : ng;
        //在新的Promise上添加回调
        var me = this;
        var nextPromise = new uiPromise(function (resolve, reject) {
            me._then(function (value) {
                try {
                    value = onSuccess(value);
                } catch (e) {
                    // https://promisesaplus.com/#point-55
                    reject(e);
                    return;
                }
                resolve(value);
            }, function (value) {
                try {
                    value = onFail(value);
                } catch (e) {
                    reject(e);
                    return;
                }
                resolve(value);
            });
        });
        for (var i in me) {
            if (!personal[i]) {
                nextPromise[i] = me[i];
            }
        }
        return nextPromise;
    },
    "done": done,
    "catch": fail,
    "fail": fail
};
var personal = {
    _state: 1,
    _fired: 1,
    _value: 1,
    _callbacks: 1
};
function _resolve(promise, value) {
    //触发成功回调
    if (promise._state !== "pending")
        return;
    if (value && typeof value.then === "function") {
        //thenable对象使用then，Promise实例使用_then
        var method = value instanceof uiPromise ? "_then" : "then";
        value[method](function (val) {
            _transmit(promise, val, true);
        }, function (reason) {
            _transmit(promise, reason, false);
        });
    } else {
        _transmit(promise, value, true);
    }
}
function _reject(promise, value) {
    //触发失败回调
    if (promise._state !== "pending")
        return;
    _transmit(promise, value, false);
}
//改变Promise的_fired值，并保持用户传参，触发所有回调
function _transmit(promise, value, isResolved) {
    promise._fired = true;
    promise._value = value;
    promise._state = isResolved ? "fulfilled" : "rejected";
    setTimeout(function() {
        var data, i, len;
        for(i = 0, len = promise._callbacks.length; i < len; i++) {
            data = promise._callbacks[i];
            promise._fire(data.onSuccess, data.onFail);
        }
    }, 0);
}
function _some(any, iterable) {
    iterable = ui.core.type(iterable) === "array" ? iterable : [];
    var n = 0, result = [], end;
    return new uiPromise(function (resolve, reject) {
        // 空数组直接resolve
        if (!iterable.length)
            resolve();
        function loop(a, index) {
            a.then(function (ret) {
                if (!end) {
                    result[index] = ret;
                    //保证回调的顺序
                    n++;
                    if (any || n >= iterable.length) {
                        resolve(any ? ret : result);
                        end = true;
                    }
                }
            }, function (e) {
                end = true;
                reject(e);
            });
        }
        for (var i = 0, l = iterable.length; i < l; i++) {
            loop(iterable[i], i);
        }
    });
}

uiPromise.all = function (iterable) {
    return _some(false, iterable);
};
uiPromise.race = function (iterable) {
    return _some(true, iterable);
};
uiPromise.defer = defer;

ui.Promise = uiPromise;
var nativePromise = window.Promise;
if (/native code/.test(nativePromise)) {
    nativePromise.prototype.done = done;
    nativePromise.prototype.fail = fail;
    if (!nativePromise.defer) { 
        //chrome实现的私有方法
        nativePromise.defer = defer;
    }
}
window.Promise = nativePromise || uiPromise;
