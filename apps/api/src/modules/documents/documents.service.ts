import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(worldId: string, type?: string) {
    return this.prisma.document.findMany({
      where: { worldId, ...(type ? { type } : {}) },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(worldId: string, data: {
    type: string;
    name: string;
    systemId?: string;
    data?: Record<string, unknown>;
    flags?: Record<string, unknown>;
    folderId?: string;
  }) {
    return this.prisma.document.create({
      data: {
        worldId,
        type: data.type,
        name: data.name,
        systemId: data.systemId,
        data: (data.data ?? {}) as any,
        flags: (data.flags ?? {}) as any,
        folderId: data.folderId,
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    data?: Record<string, unknown>;
    flags?: Record<string, unknown>;
    sort?: number;
    folderId?: string | null;
  }) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document not found');

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.data !== undefined && { data: data.data as any }),
        ...(data.flags !== undefined && { flags: data.flags as any }),
        ...(data.sort !== undefined && { sort: data.sort }),
        ...(data.folderId !== undefined && { folderId: data.folderId }),
      } as any,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document not found');
    await this.prisma.document.delete({ where: { id } });
  }
}
