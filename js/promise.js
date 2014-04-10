// Promise 3.2.0
(function(a){"function"==typeof bootstrap?bootstrap("promise",a):"object"==typeof exports?module.exports=a():"function"==typeof define&&define.amd?define(a):"undefined"!=typeof ses?ses.ok()&&(ses.makePromise=a):"undefined"!=typeof window?window.Promise=a():global.Promise=a()})(function(){return function(a,c,g){function b(f,e){if(!c[f]){if(!a[f]){var h="function"==typeof require&&require;if(!e&&h)return h(f,!0);if(d)return d(f,!0);throw Error("Cannot find module '"+f+"'");}h=c[f]={exports:{}};a[f][0].call(h.exports,
function(e){var d=a[f][1][e];return b(d?d:e)},h,h.exports)}return c[f].exports}for(var d="function"==typeof require&&require,e=0;e<g.length;e++)b(g[e]);return b}({1:[function(a,c,g){a=c.exports={};a.nextTick=function(){if("undefined"!==typeof window&&window.setImmediate)return function(b){return window.setImmediate(b)};if("undefined"!==typeof window&&window.postMessage&&window.addEventListener){var b=[];window.addEventListener("message",function(a){a.source===window&&"process-tick"===a.data&&(a.stopPropagation(),
0<b.length&&b.shift()())},!0);return function(a){b.push(a);window.postMessage("process-tick","*")}}return function(b){setTimeout(b,0)}}();a.title="browser";a.browser=!0;a.env={};a.argv=[];a.binding=function(b){throw Error("process.binding is not supported");};a.cwd=function(){return"/"};a.chdir=function(b){throw Error("process.chdir is not supported");}},{}],2:[function(a,c,g){function b(a){function r(a){null===l?n.push(a):e(function(){var b=l?a.onFulfilled:a.onRejected;if(null===b)(l?a.resolve:a.reject)(p);
else{var e;try{e=b(p)}catch(f){a.reject(f);return}a.resolve(e)}})}function h(a){g||c(a)}function c(a){if(null===l)try{if(a===t)throw new TypeError("A promise cannot be resolved with itself.");if(a&&("object"===typeof a||"function"===typeof a)){var b=a.then;if("function"===typeof b){g=!0;b.call(a,c,q);return}}l=!0;p=a;m()}catch(e){q(e)}}function k(a){g||q(a)}function q(a){null===l&&(l=!1,p=a,m())}function m(){for(var a=0,b=n.length;a<b;a++)r(n[a]);n=null}if(!(this instanceof b))return new b(a);if("function"!==
typeof a)throw new TypeError("not a function");var l=null,g=!1,p=null,n=[],t=this;this.then=function(a,e){return new b(function(b,f){r(new d(a,e,b,f))})};try{a(h,k)}catch(u){k(u)}}function d(a,b,e,d){this.onFulfilled="function"===typeof a?a:null;this.onRejected="function"===typeof b?b:null;this.resolve=e;this.reject=d}var e=a("./lib/next-tick");c.exports=b},{"./lib/next-tick":4}],3:[function(a,c,g){var b=a("./core.js"),d=a("./lib/next-tick");c.exports=b;b.from=function(a){return a instanceof b?a:
new b(function(b){b(a)})};b.denodeify=function(a){return function(){var f=this,d=Array.prototype.slice.call(arguments);return new b(function(b,c){d.push(function(a,e){a?c(a):b(e)});a.apply(f,d)})}};b.nodeify=function(a){return function(){var f=Array.prototype.slice.call(arguments),c="function"===typeof f[f.length-1]?f.pop():null;try{return a.apply(this,arguments).nodeify(c)}catch(h){if(null==c)return new b(function(a,b){b(h)});d(function(){c(h)})}}};b.all=function(){var a=Array.prototype.slice.call(1===
arguments.length&&Array.isArray(arguments[0])?arguments[0]:arguments);return new b(function(b,d){function c(k,m){try{if(m&&("object"===typeof m||"function"===typeof m)){var l=m.then;if("function"===typeof l){l.call(m,function(a){c(k,a)},d);return}}a[k]=m;0===--g&&b(a)}catch(s){d(s)}}if(0===a.length)return b([]);for(var g=a.length,k=0;k<a.length;k++)c(k,a[k])})};b.prototype.done=function(a,b){(arguments.length?this.then.apply(this,arguments):this).then(null,function(a){d(function(){throw a;})})};b.prototype.nodeify=
function(a){if(null==a)return this;this.then(function(b){d(function(){a(null,b)})},function(b){d(function(){a(b)})})}},{"./core.js":2,"./lib/next-tick":4}],4:[function(a,c,g){(function(a){c.exports="function"===typeof setImmediate?function(a){setImmediate(a)}:"undefined"!==typeof a&&a&&"function"===typeof a.nextTick?function(d){a.nextTick(d)}:function(a){setTimeout(a,0)}})(a("__browserify_process"))},{__browserify_process:1}]},{},[3])(3)});

Promise.resolve = function (value) {
	return new Promise(function (resolve) {
		resolve(value);
	});
};

Promise.reject = function (reason) {
	return new Promise(function (resolve, reject) {
		reject(reason);
	});
};

Promise.prototype.catch = function (onReject) {
	return this.then(null, onReject);
};

Promise.prototype.finally = function (onResolveOrReject) {
	return this.then(onResolveOrReject, onResolveOrReject);
};