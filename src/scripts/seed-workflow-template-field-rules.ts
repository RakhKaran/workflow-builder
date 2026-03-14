#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {ApplicationConfig} from '@loopback/core';
import {WorkflowBuilderApplication} from '../application';
import {WorkflowTemplateFieldRulesRepository} from '../repositories';
import {createAgendaConnection} from '../services/agenda/agenda-connection.service';

type SeedRule = {
  nodeName: string;
  fieldPath: string;
  action: 'clear' | 'remove' | 'regenerate';
  regenerateType?: string;
  description?: string;
  isActive?: boolean;
  remark?: string;
};

const DEFAULT_JSON_PATH = path.resolve(
  process.cwd(),
  'src',
  'scripts',
  'workflow-template-field-rules.seed.json',
);

async function loadSeedFile(filePath: string): Promise<SeedRule[]> {
  const fileContents = await fs.promises.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(fileContents);

  if (!Array.isArray(parsed)) {
    throw new Error('Seed file must contain a JSON array');
  }

  return parsed;
}

async function syncRules(
  repository: WorkflowTemplateFieldRulesRepository,
  rules: SeedRule[],
) {
  let created = 0;
  let updated = 0;

  for (const rule of rules) {
    if (!rule.nodeName || !rule.fieldPath || !rule.action) {
      throw new Error(
        `Invalid rule payload: ${JSON.stringify(rule)}. nodeName, fieldPath and action are required.`,
      );
    }

    const existingRule = await repository.findOne({
      where: {
        and: [
          {nodeName: rule.nodeName},
          {fieldPath: rule.fieldPath},
        ],
      },
    });

    const payload = {
      nodeName: rule.nodeName,
      fieldPath: rule.fieldPath,
      action: rule.action,
      regenerateType: rule.regenerateType,
      description: rule.description,
      isActive: rule.isActive ?? true,
      isDeleted: false,
      remark: rule.remark,
    };

    if (existingRule?.id) {
      await repository.updateById(existingRule.id, payload);
      updated += 1;
      console.log(`updated: ${rule.nodeName} -> ${rule.fieldPath}`);
      continue;
    }

    await repository.create(payload);
    created += 1;
    console.log(`created: ${rule.nodeName} -> ${rule.fieldPath}`);
  }

  console.log(`seed complete: created=${created}, updated=${updated}`);
}

async function main() {
  const config: ApplicationConfig = {
    rest: {
      port: 0,
      host: '127.0.0.1',
    },
  };

  const jsonPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_JSON_PATH;

  console.log(`loading workflow template field rules from: ${jsonPath}`);

  const app = new WorkflowBuilderApplication(config);
  await app.boot();
  await createAgendaConnection();
  await app.start();

  try {
    const rules = await loadSeedFile(jsonPath);
    const repository = await app.getRepository(WorkflowTemplateFieldRulesRepository);
    await syncRules(repository, rules);
  } catch (error: any) {
    console.error(`seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await app.stop();
  }
}

main().catch(error => {
  console.error('unhandled seed error:', error);
  process.exit(1);
});
