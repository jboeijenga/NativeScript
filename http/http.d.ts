﻿import image = require("image-source/image-source");
import promises = require("promises/promises");
import request = require("http/http-request");

export declare function getString(url: string): promises.Promise<string>
export declare function getString(options: request.HttpRequestOptions): promises.Promise<string>

export declare function getJSON<T>(url: string): promises.Promise<T>
export declare function getJSON<T>(options: request.HttpRequestOptions): promises.Promise<T>

export declare function getImage(url: string): promises.Promise<image.ImageSource>
export declare function getImage(options: request.HttpRequestOptions): promises.Promise<image.ImageSource>

export declare function request(options: HttpRequestOptions): promises.Promise<HttpResponse>;

export interface HttpRequestOptions {
    url: string;
    method: string;
    headers?: any;
    content?: any;
    timeout?: number;
}

export interface HttpResponse {
    statusCode: number;
    headers: any;
    content?: HttpContent;
}

export interface HttpContent {
    raw: any;
    toString: () => string;
    toJSON: () => any;
    toImage: () => image.ImageSource;
}