import { z } from "zod";
import type { AxiosInstance } from "axios";

// --- Zod Schemas for Collections API ---

export const CollectionModelSchema = z.object({
	id: z.string(),
	sha: z.string(),
	json_schema: z.union([z.string(), z.record(z.string(), z.any())]),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});

export const CollectionDeleteModelSchema = z.object({
	code: z.number(),
});

// --- Derived TypeScript Types ---

export type CollectionModel = z.infer<typeof CollectionModelSchema>;
export type CollectionDeleteModel = z.infer<
	typeof CollectionDeleteModelSchema
>;

// --- Collections Client Class ---

export class Collections {
	private client: AxiosInstance;

	constructor(client: AxiosInstance) {
		this.client = client;
	}

	async create(args: {
		json_schema: Record<string, any>;
	}): Promise<CollectionModel> {
		const response = await this.client.post("/collections", args.json_schema);
		return CollectionModelSchema.parse(response.data);
	}

	async retrieve(args: { collection_id: string }): Promise<CollectionModel> {
		const response = await this.client.get(`/collections/${args.collection_id}`);
		return CollectionModelSchema.parse(response.data);
	}

	async delete(args: {
		collection_id: string;
	}): Promise<CollectionDeleteModel> {
		const response = await this.client.delete(
			`/collections/${args.collection_id}`
		);
		return CollectionDeleteModelSchema.parse(response.data);
	}

	async list(): Promise<CollectionModel[]> {
		const response = await this.client.get("/collections");
		return z.array(CollectionModelSchema).parse(response.data);
	}
}