/// <amd-dependency path="./has!host-browser?./request/xhr:host-node?./request/node" />
declare var require:(moduleId:string) => any;

import has = require('./has');
import Promise = require('./Promise');
import Registry = require('./Registry');

module request {
	export interface IRequestFilter {
		(response:IResponse, url:string, options:IRequestOptions):any;
	}

	export interface IRequestProvider {
		(url:string, options:IRequestOptions):IRequestPromise;
	}

	export interface IRequestOptions {
		auth?:string;
		cacheBust?:any;
		data?:any;
		headers?:{ [name:string]:string; };
		method?:string;
		password?:string;
		query?:string;
		responseType?:string;
		timeout?:number;
		user?:string;
	}

	export interface IRequestPromise extends Promise<IResponse> {
		data:Promise<any>;
	}

	export interface IResponse {
		data:any;
		getHeader(name:string):string;
		nativeResponse?:any;
		requestOptions:IRequestOptions;
		statusCode:number;
		url:string;
	}
}

var defaultProvider:request.IRequestProvider;

if (has('host-node')) {
	defaultProvider = require('./request/node');
}
else if (has('host-browser')) {
	defaultProvider = require('./request/xhr');
}

/* tslint:disable:class-name */
interface request extends request.IRequestProvider {
/* tslint:enable:class-name */
	filterRegistry:Registry<request.IRequestFilter>;
	providerRegistry:Registry<request.IRequestProvider>;

	delete(url:string, options?:request.IRequestOptions):request.IRequestPromise;
	get(url:string, options?:request.IRequestOptions):request.IRequestPromise;
	post(url:string, options?:request.IRequestOptions):request.IRequestPromise;
	put(url:string, options?:request.IRequestOptions):request.IRequestPromise;
}

var request = <request> function (url:string, options:request.IRequestOptions):request.IRequestPromise {
	var args:any[] = Array.prototype.slice.call(arguments, 0);

	var promise:request.IRequestPromise = request.providerRegistry.match(arguments).apply(null, arguments).then(function (response:request.IResponse):Promise<request.IResponse> {
		args.unshift(response);
		return Promise.resolve(request.filterRegistry.match(args).apply(null, args)).then(function (data:any):request.IResponse {
			response.data = data;
			return response;
		});
	});

	promise.data = promise.then(function (response:request.IResponse):any {
		return response.data;
	});

	return promise;
};

request.providerRegistry = new Registry<request.IRequestProvider>(defaultProvider);
request.filterRegistry = new Registry<request.IRequestFilter>(function (value:any):any {
	return value;
});

// TODO: Put somewhere permanent
request.filterRegistry.register(function (response:request.IResponse, url:string, options:request.IRequestOptions):boolean {
	return typeof response.data === 'string' && options.responseType === 'json';
}, function (response:request.IResponse, url:string, options:request.IRequestOptions):Object {
	return JSON.parse(response.data);
});

[ 'delete', 'get', 'post', 'put' ].forEach(function (method:string):void {
	request[method] = function (url:string, options:request.IRequestOptions):request.IRequestPromise {
		options = Object.create(options);
		options.method = method.toUpperCase();
		return request(url, options);
	};
});

export = request;