import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/services/reporterPrefill.js', import.meta.url), 'utf8');
const { inspectorReporterDefaults, applyReporterDefaults } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('known name is prefilled without inventing employee ID, mobile number or employment type', () => {
  const defaults = inspectorReporterDefaults({ name: 'Inspector A', agency: 'Agency A', username: 'inspector.a', slNo: 12, jobRole: 'Inspection', bay: '4' });
  assert.equal(defaults.reportedByName, 'Inspector A');
  for (const key of ['empId', 'mobileNumber', 'departmentContractor', 'department', 'contractorName']) assert.equal(defaults[key], '');
});

test('saved employee details are reused and selecting contractor prefills the agency', () => {
  const profile = { name: 'Inspector A', agency: 'Agency A' };
  const saved = { name: 'Old name', departmentContractor: 'Employee', empId: 'EMP-123', department: 'Quality', mobileNumber: '1234567890' };
  const employee = inspectorReporterDefaults(profile, saved);
  assert.equal(employee.reportedByName, profile.name);
  assert.equal(employee.empId, saved.empId);
  assert.equal(employee.department, 'Quality');
  assert.equal(employee.mobileNumber, saved.mobileNumber);
  const contractor = inspectorReporterDefaults(profile, saved, 'Contractor');
  assert.equal(contractor.contractorName, 'Agency A');
  assert.equal(contractor.empId, '');
  assert.equal(contractor.department, '');
  assert.equal(inspectorReporterDefaults(profile, saved, 'Visitor').contractorName, '');
});

test('late profile loading preserves user edits and does not fill incident or victim fields', () => {
  const form = { reportedByName: 'Edited name', mobileNumber: '', observation: 'Safety observation', location: 'Yard', victims: [{ name: 'Victim' }] };
  const result = applyReporterDefaults(form, { reportedByName: 'Inspector A', mobileNumber: '1234567890', departmentContractor: 'Contractor', contractorName: 'Agency A' }, new Set(['reportedByName', 'mobileNumber']));
  assert.equal(result.reportedByName, 'Edited name');
  assert.equal(result.mobileNumber, '');
  assert.equal(result.contractorName, 'Agency A');
  assert.equal(result.observation, form.observation);
  assert.equal(result.location, form.location);
  assert.equal(result.victims, form.victims);
  const cleared = applyReporterDefaults(result, {}, new Set());
  assert.equal(cleared.reportedByName, '');
  assert.equal(cleared.contractorName, '');
  assert.equal(cleared.observation, form.observation);
});

test('saved reporter details are isolated by account and do not use another reporter on the device', async () => {
  const storage = new Map();
  const code = (await readFile(new URL('../src/storage/reporterProfile.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/m, '').replace(/export /g, '');
  const context = vm.createContext({ AsyncStorage: {
    setItem: async (key, value) => storage.set(key, value),
    getItem: async (key) => storage.get(key) || null,
  } });
  vm.runInContext(code + '\nglobalThis.api = {saveReporterProfile, getReporterProfile};', context);
  await context.api.saveReporterProfile({ name: 'Guest', mobileNumber: '111' });
  assert.equal(await context.api.getReporterProfile('inspector.a'), null);
  await context.api.saveReporterProfile({ name: 'Inspector A', mobileNumber: '222' }, 'inspector.a');
  assert.equal((await context.api.getReporterProfile('inspector.a')).mobileNumber, '222');
  assert.equal(await context.api.getReporterProfile('inspector.b'), null);
  assert.equal((await context.api.getReporterProfile()).mobileNumber, '222');
});
