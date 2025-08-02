import { z } from "zod";
import type { AxiosInstance } from "axios";

// --- Zod Schemas for Vector API ---

export const EmbedTextSchema = z.object({
	input: z.array(z.string()),
	model: z.literal("gemini-embedding-001"),
});

export const QueryTextSchema = z.object({
	input: z.string(),
	top_k: z.number().int(),
	model: z.literal("gemini-embedding-001"),
});

export const UpsertItemSchema = z.object({
	id: z.string(),
	content: z.string(),
});

export const EmbeddingSchema = z.object({
	id: z.string(),
	content: z.union([z.string(), z.array(z.string())]),
	embedding: z.array(z.number()),
});

export const QueryItemSchema = UpsertItemSchema.extend({
	score: z.number(),
});

export const UpsertResponseSchema = z.object({
	count: z.number(),
	ellapsed: z.number(),
	data: z.array(UpsertItemSchema),
});

export const QueryResponseSchema = z.object({
	data: z.array(QueryItemSchema),
	count: z.number(),
	ellapsed: z.number(),
});

export const DeleteResponseSchema = z.object({
	data: z.array(z.string()),
	count: z.number(),
	ellapsed: z.number(),
});

// --- Derived TypeScript Types ---

export type EmbedText = z.infer<typeof EmbedTextSchema>;
export type QueryText = z.infer<typeof QueryTextSchema>;
export type UpsertItem = z.infer<typeof UpsertItemSchema>;
export type Embedding = z.infer<typeof EmbeddingSchema>;
export type QueryItem = z.infer<typeof QueryItemSchema>;
export type UpsertResponse = z.infer<typeof UpsertResponseSchema>;
export type QueryResponse = z.infer<typeof QueryResponseSchema>;
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

// --- Vectors Client Class ---

export class Vectors {
	private client: AxiosInstance;

	constructor(client: AxiosInstance) {
		this.client = client;
	}

	async list(args: { namespace: string }): Promise<string[]> {
		const response = await this.client.get(`/vector/${args.namespace}`);
		return z.array(z.string()).parse(response.data);
	}

	async retrieve(args: { namespace: string; id: string }): Promise<Embedding[]> {
		const response = await this.client.get(`/vector/${args.namespace}/${args.id}`);
		return z.array(EmbeddingSchema).parse(response.data);
	}

	async upsert(args: { namespace: string } & EmbedText): Promise<UpsertResponse> {
		const { namespace, ...body } = args;
		const response = await this.client.post(`/vector/${namespace}`, body);
		return UpsertResponseSchema.parse(response.data);
	}

	async query(args: { namespace: string } & QueryText): Promise<QueryResponse> {
		const { namespace, ...body } = args;
		const response = await this.client.put(`/vector/${namespace}`, body);
		return QueryResponseSchema.parse(response.data);
	}

	async delete(args: {
		namespace: string;
		ids: string[];
	}): Promise<DeleteResponse> {
		const response = await this.client.delete(`/vector/${args.namespace}`, {
			params: { ids: args.ids },
		});
		return DeleteResponseSchema.parse(response.data);
	}
}