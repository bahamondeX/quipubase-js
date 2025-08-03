// sseStream.ts
import type { AxiosInstance, Method } from 'axios'

export async function* sseStream<T>(
	clientOrUrl: AxiosInstance | string,
	method: Method = 'GET',
	url?: string,
	params?: any
): AsyncGenerator<T> {
	const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined'

	if (isBrowser) {

		const eventSource = new EventSource(typeof clientOrUrl === 'string' ? `https://quipubase.oscarbahamonde.com/v1${clientOrUrl}` : `https://quipubase.oscarbahamonde.com/v1${url}`!)
		const queue: T[] = []
		let done = false
		let resume: ((value: T) => void) | null = null

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data)
				if (resume) {
					resume(data as T)
					resume = null
				} else {
					queue.push(data as T)
				}
			} catch (err) {
				console.error('Failed to parse SSE:', event.data, err)
			}
		}

		eventSource.onerror = (err) => {
			console.error('SSE error:', err)
			done = true
			eventSource.close()
		}

		while (!done) {
			if (queue.length > 0) {
				yield queue.shift()!
			} else {
				yield await new Promise<T>((res) => (resume = res))
			}
		}

		return
	}

	// Node.js: use Axios stream + readline
	const { createInterface } = await import('readline')
	const client = clientOrUrl as AxiosInstance

	const response = await client({
		method,
		url: url!,
		params,
		responseType: 'stream',
		headers: {
			Accept: 'text/event-stream'
		}
	})

	const rl = createInterface({
		input: response.data,
		crlfDelay: Infinity
	})

	let dataBuffer = ''

	for await (const line of rl) {
		if (line.trim() === '') {
			if (dataBuffer) {
				try {
					yield JSON.parse(dataBuffer) as T
				} catch (err) {
					console.error('Failed to parse chunk:', dataBuffer, err)
				}
				dataBuffer = ''
			}
			continue
		}

		if (line.startsWith('data:')) {
			dataBuffer += line.slice(5).trim()
		}
	}
}