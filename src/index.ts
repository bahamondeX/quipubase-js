import OpenAI from "openai";
import axios, { type AxiosInstance } from "axios";
import { Blobs } from "./blobs";
import { Collections } from "./collections";
import { Objects } from "./objects";
import { Query } from "./query";
import { Vectors } from "./vector";

// Re-export all schemas and types for easy access
export * from "./blobs";
export * from "./collections";
export * from "./objects";
export * from "./query";
export * from "./vector";


export interface QuipubaseOptions {
	baseURL?: string;
	apiKey?: string;
	timeout?: number;
}

export class Quipubase extends OpenAI {
	private axiosClient: AxiosInstance;

	constructor(options: QuipubaseOptions = {}) {
		const {
			baseURL = "https://quipubase.oscarbahamonde.com/v1",
			apiKey = "[DEFAULT]",
			timeout = 86400
		} = options;

		// Initialize OpenAI parent class
		super({ baseURL, apiKey, timeout, dangerouslyAllowBrowser: true });

		// Initialize and configure a separate Axios client for requests
		this.axiosClient = axios.create({
			baseURL,
			timeout,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			// Axios needs to handle array params correctly for the vector delete endpoint
			paramsSerializer: params => {
				const usp = new URLSearchParams();
				for (const key in params) {
					const value = params[key];
					if (Array.isArray(value)) {
						value.forEach(v => usp.append(key, v));
					} else {
						usp.append(key, value);
					}
				}
				return usp.toString();
			}
		});
	}

	/**
	 * Access the Collections endpoint.
	 */
	get collections(): Collections {
		return new Collections(this.axiosClient);
	}

	/**
	 * Access the Objects endpoint for real-time data manipulation.
	 */
	get objects(): Objects {
		return new Objects(this.axiosClient);
	}

	/**
	 * Access the Live Query endpoint.
	 */
	get query(): Query {
		return new Query(this.axiosClient);
	}

	/**
	 * Access the Vector embeddings endpoint.
	 */
	get vector(): Vectors {
		return new Vectors(this.axiosClient);
	}

	/**
	 * Access the Blobs endpoint for file storage.
	 */
	get blobs(): Blobs {
		return new Blobs(this.axiosClient);
	}
}