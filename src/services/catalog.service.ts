import { catalogRepository } from '@/src/repositories/catalog.repository'

export class CatalogService {
    async getActiveCatalog() {
        return catalogRepository.listActivePrograms()
    }
}

export const catalogService = new CatalogService()
