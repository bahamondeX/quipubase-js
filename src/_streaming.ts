import type { AxiosInstance, Method } from "axios";
import { createInterface } from "readline";

/**
 * A generic async generator to handle Server-Sent Events (SSE) from an Axios stream.
 * It reads the stream line-by-line, parses "data: ..." events, and yields the JSON-parsed data.
 *
 * @param client The Axios instance.
 * @param method The HTTP method.
 * @param url The endpoint URL.
 * @param params Optional URL query parameters.
 * @returns An async generator that yields parsed data chunks of type T.
 */
export async function* sseStream<T>(
	client: AxiosInstance,
	method: Method,
	url: string,
	params?: any
): AsyncGenerator<T> {
	const response = await client({
		method,
		url,
		params,
		responseType: "stream",
	});

	const rl = createInterface({
		input: response.data,
		crlfDelay: Infinity,
	});

	for await (const line of rl) {
		if (line.startsWith("data: ")) {
			const data = line.substring(6).trim();
			if (data) {
				try {
					yield JSON.parse(data) as T;
				} catch (e) {
					console.error("Failed to parse SSE data chunk:", data, e);
				}
			}
		}
	}
}