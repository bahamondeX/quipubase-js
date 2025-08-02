import { z } from "zod";
import type { AxiosInstance } from "axios";
import { sseStream } from "./_streaming";
import FormData from "form-data";

// Type Aliases for file content
export type FileContent = Buffer | Blob | string;

// --- Zod Schemas for Blobs API ---

export const ChunkFileSchema = z.object({
	chunks: z.array(z.string()),
	created: z.number(),
	chunkedCount: z.number(),
});

export const FileTypeSchema = z.object({
	url: z.string(),
	path: z.string(),
});

export const GetOrCreateFileSchema = z.object({
	data: FileTypeSchema,
	created: z.number(),
});

export const DeleteFileSchema = z.object({
	deleted: z.boolean(),
});

// Recursive schema for file tree
const baseTreeNodeSchema = z.object({
	type: z.enum(["file", "folder"]),
	name: z.string(),
	path: z.string(),
});

type TreeNode = z.infer<typeof baseTreeNodeSchema> & {
	content: string | TreeNode[];
};

export const TreeNodeSchema: z.ZodType<TreeNode> = baseTreeNodeSchema.extend({
	content: z.lazy(() => z.union([z.string(), z.array(TreeNodeSchema)])),
});


// --- Derived TypeScript Types ---

export type ChunkFile = z.infer<typeof ChunkFileSchema>;
export type FileType = z.infer<typeof FileTypeSchema>;
export type GetOrCreateFile = z.infer<typeof GetOrCreateFileSchema>;
export type DeleteFile = z.infer<typeof DeleteFileSchema>;

// --- Blobs Client Class ---

export class Blobs {
	private client: AxiosInstance;

	constructor(client: AxiosInstance) {
		this.client = client;
	}

	async chunk(args: {
		file: FileContent;
		format: "html" | "text";
	}): Promise<ChunkFile> {
		const form = new FormData();
		form.append("file", args.file);
		const response = await this.client.post("/blob", form, {
			params: { format: args.format },
			headers: form.getHeaders(),
		});
		return ChunkFileSchema.parse(response.data);
	}

	async create(args: {
		path: string;
		file: FileContent;
		bucket?: string;
	}): Promise<GetOrCreateFile> {
		const form = new FormData();
		form.append("file", args.file);
		const response = await this.client.put(`/blob/${args.path}`, form, {
			params: { bucket: args.bucket ?? "quipu-store" },
			headers: form.getHeaders(),
		});
		return GetOrCreateFileSchema.parse(response.data);
	}

	async delete(args: {
		path: string;
		bucket?: string;
	}): Promise<DeleteFile> {
		const response = await this.client.delete(`/blob/${args.path}`, {
			params: { bucket: args.bucket ?? "quipu-store" },
		});
		return DeleteFileSchema.parse(response.data);
	}

	async retrieve(args: {
		path: string;
		bucket?: string;
	}): Promise<GetOrCreateFile> {
		const response = await this.client.get(`/blob/${args.path}`, {
			params: { bucket: args.bucket ?? "quipu-store" },
		});
		return GetOrCreateFileSchema.parse(response.data);
	}

	async *list(args: {
		path: string;
		bucket?: string;
	}): AsyncGenerator<FileType> {
		yield* sseStream<FileType>(
			this.client,
			"GET",
			`/blobs/${args.path}`,
			{ bucket: args.bucket ?? "quipu-store" }
		);
	}
}