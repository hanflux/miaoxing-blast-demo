'use strict';
// Earliest Web review-only glue. Business checkpoint and game code are unchanged.
(function(g){
 const NS='nc-mg-003-ads001-qa/ads001-g2-hl001r2-20261105-41f89c7ad906/';
 const fail=()=>{throw Error('ADS001_WEB_STORAGE_OUTSIDE_REVIEW');};
 const physical=key=>{if(typeof key!=='string')return fail();if(key==='storage')return NS+'engine-probe-storage-v1';if(key.startsWith(NS))return key;return fail();};
 for(const op of ['getItem','setItem','removeItem']){const native=g.Storage.prototype[op];Object.defineProperty(g.Storage.prototype,op,{configurable:false,writable:false,value:function(key,...args){return native.call(this,physical(key),...args);}});}
 for(const op of ['clear','key'])Object.defineProperty(g.Storage.prototype,op,{configurable:false,writable:false,value:fail});
 if(g.indexedDB){const factory=g.indexedDB;
  for(const op of ['open','deleteDatabase']){const native=factory[op];Object.defineProperty(factory,op,{configurable:false,writable:false,value:function(name,...args){if(typeof name!=='string'||!name.startsWith(NS))return fail();return native.call(factory,name,...args);}});}
  Object.defineProperty(factory,'databases',{configurable:false,writable:false,value:fail});
 }
 Object.defineProperty(g,'__ADS001_WEB_REVIEW_GUARD__',{value:Object.freeze({namespace:NS,version:1,engineProbeMapped:true}),configurable:false,writable:false});
})(globalThis);
