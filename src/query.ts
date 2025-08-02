import { z } from "zod";
import type { AxiosInstance } from "axios";

// --- Zod Schemas for Query API ---

export const LiveQueryDatasetMetadataSchema = z.object({
	key: z.string(),
	bucket: z.string().optional(),
	namespace: z.string().optional(),
});

export const LiveQueryDatasetQuerySchema = LiveQueryDatasetMetadataSchema.extend(
	{
		query: z.string(),
	}
);

export const LiveQueryDatasetUpdateSchema = LiveQueryDatasetMetadataSchema.extend(
	{
		data: z.array(z.record(z.string(), z.any())),
	}
);

export const AdapterSchema = z.object({
	engine: z.enum(["file", "mongodb", "postgresql"]),
	uri: z.string(),
	query: z.string(),
	key: z.string().optional(),
	namespace: z.string().optional(),
	bucket: z.string().optional(),
});

export const DatasetMetadataResponseSchema = z.object({
	key: z.string(),
	bucket: z.string(),
	namespace: z.string(),
});

export const QueryLiveResponseSchema = z.object({
	data: z.array(z.record(z.string(), z.any())),
	json_schema: z.record(z.string(), z.any()),
	key: z.string(),
});

export const DeleteQueryDatasetResponseSchema = z.object({
	success: z.boolean(),
});

export const JsonSchemaModelSchema = z.record(z.string(), z.any());

// --- Derived TypeScript Types ---

export type LiveQueryDatasetMetadata = z.infer<typeof LiveQueryDatasetMetadataSchema>;
export type LiveQueryDatasetQuery = z.infer<typeof LiveQueryDatasetQuerySchema>;
export type LiveQueryDatasetUpdate = z.infer<typeof LiveQueryDatasetUpdateSchema>;
export type Adapter = z.infer<typeof AdapterSchema>;
export type DatasetMetadataResponse = z.infer<typeof DatasetMetadataResponseSchema>;
export type QueryLiveResponse = z.infer<typeof QueryLiveResponseSchema>;
export type DeleteQueryDatasetResponse = z.infer<typeof DeleteQueryDatasetResponseSchema>;
export type JsonSchemaModel = z.infer<typeof JsonSchemaModelSchema>;

// --- Query Client Class ---

export class Query {
	private client: AxiosInstance;

	constructor(client: AxiosInstance) {
		this.client = client;
	}

	async list(args?: {
		namespace?: string;
		bucket?: string;
	}): Promise<DatasetMetadataResponse[]> {
		const response = await this.client.get("/query/live", {
			params: {
				namespace: args?.namespace ?? "default",
				bucket: args?.bucket ?? "quipu-store",
			},
		});
		return z.array(DatasetMetadataResponseSchema).parse(response.data);
	}

	async create(adapter: Adapter): Promise<QueryLiveResponse> {
		const response = await this.client.post("/query/live", adapter);
		return QueryLiveResponseSchema.parse(response.data);
	}

	async retrieve(query: LiveQueryDatasetQuery): Promise<QueryLiveResponse> {
		const response = await this.client.put("/query/live", query);
		return QueryLiveResponseSchema.parse(response.data);
	}

	async update(update: LiveQueryDatasetUpdate): Promise<QueryLiveResponse> {
		const response = await this.client.patch("/query/live", update);
		return QueryLiveResponseSchema.parse(response.data);
	}

	async delete(args: {
		key: string;
		bucket?: string;
		namespace?: string;
	}): Promise<DeleteQueryDatasetResponse> {
		const response = await this.client.delete("/query/live", {
			params: {
				key: args.key,
				bucket: args.bucket ?? "quipu-store",
				namespace: args.namespace ?? "default",
			},
		});
		return DeleteQueryDatasetResponseSchema.parse(response.data);
	}

	async describe(metadata: LiveQueryDatasetMetadata): Promise<JsonSchemaModel> {
		const response = await this.client.post("/query/schema", metadata);
		return JsonSchemaModelSchema.parse(response.data);
	}
}