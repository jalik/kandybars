/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 Karl STEIN
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Regexp of a block argument
 * @type {RegExp}
 * */
export const BLOCK_ARGS_REGEX = /\b((?:this\.|\.\.\/)?[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g;

/**
 * Regexp of a comment block
 * @type {RegExp}
 * */
export const COMMENT_BLOCK_REGEX = /{{![^}]+?}}/g;

/**
 * Regexp of a template context path
 * @type {RegExp}
 * */
export const CONTEXT_PATH_REGEX = /^(?:this\.|\.\.\/)?[a-zA-Z_][a-zA-Z0-9_]*(?:(?:\[[a-zA-Z0-9_]*])?|\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/**
 * Regexp of an "each" block
 * @type {RegExp}
 * */
export const EACH_BLOCK_REGEX = /{{#each ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}([\s\S]*?){{\/each}}/g;

/**
 * Regexp of an eval block
 * @type {RegExp}
 * */
export const EVAL_BLOCK_REGEX = /{{eval ([^}]+)}}/g;

/**
 * Regexp of a helper block
 * @type {RegExp}
 * */
export const HELPER_BLOCK_REGEX = /{{([a-zA-Z0-9_]+) ([^}]+)}}/g;

/**
 * Regexp of an condition block
 * @type {RegExp}
 * */
export const IF_BLOCK_REGEX = /{{#if ([^}]+)}}((?:(?!{{#if)[\s\S])*?){{\/if}}/g;

/**
 * Regexp of a partial block
 * @type {RegExp}
 * */
export const PARTIAL_BLOCK_REGEX = /{{> *([^ }]+)( +[^}]+)*}}/g;

/**
 * Regexp of a template definition
 * @type {RegExp}
 * */
export const TEMPLATE_BLOCK_REGEX = /<template[^>]*>([\s\S]*?)<\/template>/g;

/**
 * Regexp of a template tag
 * @type {RegExp}
 * */
export const TEMPLATE_TAGS_REGEX = /<template[^>]*>|<\/template>/g;

/**
 * Regexp of a variable block
 * @type {RegExp}
 * */
export const VARIABLE_BLOCK_REGEX = /{{{?((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}}?/g;

/**
 * Regexp of a "with" block
 * @type {RegExp}
 * */
export const WITH_BLOCK_REGEX = /{{#with ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}([\s\S]*?){{\/with}}/g;
