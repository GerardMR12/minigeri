import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { loadInstruction } from '../src/utils/instructions.js';

describe('instructions utils', () => {
    test('loadInstruction should return null if existsSync returns false', (t) => {
        t.mock.method(fs, 'existsSync', () => false);
        const result = loadInstruction('any-instruction-file');
        assert.strictEqual(result, null);
    });

    test('loadInstruction should return null if readFileSync throws an error', (t) => {
        // mock existsSync to return true so it proceeds to try block
        t.mock.method(fs, 'existsSync', () => true);

        // mock readFileSync to throw an error to trigger the catch block
        t.mock.method(fs, 'readFileSync', () => {
            throw new Error('Simulated read error');
        });

        const result = loadInstruction('any-instruction-file');
        assert.strictEqual(result, null);
    });
});
