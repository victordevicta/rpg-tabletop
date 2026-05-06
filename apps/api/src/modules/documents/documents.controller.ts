import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { IsJSON, IsObject, IsOptional, IsString } from 'class-validator';

class CreateDocumentDto {
  @IsString() type!: string;
  @IsString() name!: string;
  @IsString() @IsOptional() systemId?: string;
  @IsObject() @IsOptional() data?: Record<string, unknown>;
  @IsObject() @IsOptional() flags?: Record<string, unknown>;
  @IsString() @IsOptional() folderId?: string;
}

class UpdateDocumentDto {
  @IsString() @IsOptional() name?: string;
  @IsObject() @IsOptional() data?: Record<string, unknown>;
  @IsObject() @IsOptional() flags?: Record<string, unknown>;
  @IsOptional() sort?: number;
  @IsString() @IsOptional() folderId?: string | null;
}

@Controller('worlds/:worldId/documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private docs: DocumentsService) {}

  @Get()
  list(@Param('worldId') worldId: string, @Query('type') type?: string) {
    return this.docs.findAll(worldId, type);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.docs.findOne(id);
  }

  @Post()
  create(@Param('worldId') worldId: string, @Body() dto: CreateDocumentDto) {
    return this.docs.create(worldId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.docs.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.docs.delete(id);
  }
}
