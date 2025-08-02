import { z } from "zod";
import type { AxiosInstance } from "axios";
import { sseStream } from "./_streaming";

// --- Zod Schemas for Objects API ---

export const QuipuActionsSchema = z.enum([
	"create",
	"read",
	"update",
	"delete",
	"query",
	"stop",
]);

export const SubResponseSchema = z.object({
	event: QuipuActionsSchema,
	data: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]),
});

export const PubResponseSchema = z.object({
	collection: z.string(),
	data: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]),
	event: QuipuActionsSchema,
});

export const QuipubaseRequestSchema = z.object({
	event: QuipuActionsSchema,
	id: z.string().optional(),
	data: z.record(z.string(), z.any()).optional(),
});

// --- Derived TypeScript Types ---

export type QuipuActions = z.infer<typeof QuipuActionsSchema>;
export type SubResponse = z.infer<typeof SubResponseSchema>;
export type PubResponse = z.infer<typeof PubResponseSchema>;
export type QuipubaseRequest = z.infer<typeof QuipubaseRequestSchema>;

// --- Objects Client Class ---

export class Objects {
	private client: AxiosInstance;

	constructor(client: AxiosInstance) {
		this.client = client;
	}

	async *sub(args: {
		collection_id: string;
	}): AsyncGenerator<SubResponse> {
		yield* sseStream<SubResponse>(
			this.client,
			"GET",
			`/collections/objects/${args.collection_id}`,
			{ stream: true }
		);
	}

	async pub(
		args: { collection_id: string } & QuipubaseRequest
	): Promise<PubResponse> {
		const { collection_id, ...body } = args;
		const response = await this.client.post(
			`/collections/objects/${collection_id}`,
			body
		);
		return PubResponseSchema.parse(response.data);
	}
}