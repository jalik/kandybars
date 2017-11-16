/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Karl STEIN
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
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export default {

    /**
     * Regexp of a block
     * @type {RegExp}
     */
    blockPattern: /{{#each ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}([\s\S]*?){{\/each}}/g,

    /**
     * Regexp of a comment
     * @type {RegExp}
     */
    commentPattern: /{{![^}]+?}}/g,

    /**
     * Regexp of an eval block
     * @type {RegExp}
     */
    evalPattern: /{{eval ([^}]+)}}/g,

    /**
     * Regexp of an expression block
     * @type {RegExp}
     */
    expressionPattern: /{{#if ([^}]+)}}((?:(?!{{#if)[\s\S])*?){{\/if}}/g,

    /**
     * Regexp of a helper
     * @type {RegExp}
     */
    helperPattern: /{{([a-zA-Z0-9_]+) ([^}]+)}}/g,

    /**
     * Regexp of a path
     * @type {RegExp}
     */
    pathPattern: /^(?:this\.|\.\.\/)?[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*$/,

    /**
     * Regexp of a partial
     * @type {RegExp}
     */
    partialPattern: /{{> *([^ }]+)( +[^}]+)*}}/g,

    /**
     * Regexp of a template block
     * @type {RegExp}
     */
    templatePattern: /<template[^>]*>([\s\S]*?)<\/template>/g,

    /**
     * Regexp of a template name
     * @type {RegExp}
     */
    templateNamePattern: /name="([^"]+)"/,

    /**
     * Regexp of a template tag
     * @type {RegExp}
     */
    templateTagsPattern: /<template[^>]*>|<\/template>|/g,

    /**
     * Regexp of a value
     * @type {RegExp}
     */
    valuePattern: /\b((?:this\.|\.\.\/)?[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z0-9_$]+)*)\b(?!["'])/g,

    /**
     * Regexp of a variable
     * @type {RegExp}
     */
    varPattern: /{{{?((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}}?/g,

    /**
     * Regexp of a with block
     * @type {RegExp}
     */
    withPattern: /{{#with ((?:this\.|\.\.\/)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)}}([\s\S]*?){{\/with}}/g
};
