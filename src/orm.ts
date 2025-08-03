// models/index.ts
import { z, ZodTypeAny } from 'zod'
import { zodToJsonSchema, JsonSchema7Type } from 'zod-to-json-schema'
import { PubResponse, QuipuActions } from './index'
import Quipubase from './index'

export abstract class BaseModel<T extends ZodTypeAny> {
	static schema: ZodTypeAny
	static q: Quipubase
	protected _data: z.infer<T>

	constructor(data: z.infer<T>) {
		const schema = (this.constructor as typeof BaseModel).getZodSchema() as T
		const result = schema.safeParse(data)
		if (!result.success) {
			throw new Error(
				`[${this.constructor.name}] Validation failed: ${JSON.stringify(
					result.error.format(),
					null,
					2
				)}`
			)
		}
		this._data = result.data
	}

	// --- STATIC METHODS ---

	static getZodSchema(): ZodTypeAny {
		return this.schema
	}

	static modelJsonSchema(): JsonSchema7Type {
		const { $schema, ...jsonSchema } = zodToJsonSchema(this.getZodSchema())
		return jsonSchema as JsonSchema7Type
	}

	static async getCollectionId(): Promise<string> {
		const jsonSchema = this.modelJsonSchema()
		const newCollection = await this.q.collections.create({ json_schema: jsonSchema })
		return newCollection.id
	}

	static subscribe(
		callback: (response: { event: QuipuActions; data: any }) => void
	): void {
		; (async () => {
			try {
				const collectionId = await this.getCollectionId()
				const schema = this.getZodSchema()

				for await (const message of this.q.objects.sub({ collection_id: collectionId })) {
					const { data, event } = message

					switch (event) {
						case 'read':
						case 'create':
						case 'update':
						case 'query': {
							const result = Array.isArray(data)
								? z.array(schema).safeParse(data)
								: schema.safeParse(data)

							if (result.success) {
								callback({ event, data: result.data })
							} else {
								console.error(
									`[onSnapshot] Validation failed for event '${event}':`,
									result.error.format()
								)
							}
							break
						}
						case 'delete':
							callback({ event, data })
							break
						default:
							break
					}
				}
			} catch (error) {
				console.error(`[onSnapshot] Error in subscription for ${this.name}:`, error)
			}
		})()
	}

	static async delete(id: string): Promise<PubResponse> {
		const collection_id = await this.getCollectionId()
		return await this.q.objects.pub({
			collection_id,
			event: 'delete',
			id,
		})
	}

	static async query<T extends ZodTypeAny>(
		values: Partial<z.infer<T>>
	): Promise<z.infer<T>[]> {
		const collection_id = await this.getCollectionId()
		const result = await this.q.objects.pub({
			collection_id,
			event: 'query',
			data: values,
		})

		return Array.isArray(result.data)
			? z.array(this.getZodSchema()).parse(result.data)
			: [this.getZodSchema().parse(result.data)]
	}

	// --- INSTANCE METHODS ---

	modelDump(): z.infer<T> {
		return this._data
	}

	modelDumpJson(): string {
		return JSON.stringify(this._data)
	}

	async upsert(): Promise<PubResponse> {
		const collection_id = await (this.constructor as typeof BaseModel).getCollectionId()
		const data = this.modelDump()

		const event = (data as any).id ? 'update' : 'create'
		if (event === 'update') {
			return await (this.constructor as typeof BaseModel).q.objects.pub({
				collection_id,
				event,
				id: data.id,
				data,
			})
		}
		else {
			return await (this.constructor as typeof BaseModel).q.objects.pub({
				collection_id,
				event,
				data,
			})
		}
	}
}
