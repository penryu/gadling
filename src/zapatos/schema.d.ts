/*
** DON'T EDIT THIS FILE **
It's been generated by Zapatos, and is liable to be overwritten

Zapatos: https://jawj.github.io/zapatos/
Copyright (C) 2020 - 2022 George MacKerron
Released under the MIT licence: see LICENCE file
*/

declare module 'zapatos/schema' {

  import type * as db from 'zapatos/db';

  // got a type error on schemaVersionCanary below? update by running `npx zapatos`
  export interface schemaVersionCanary extends db.SchemaVersionCanary { version: 104 }


  /* === schema: public === */

  /* --- enums --- */
  /* (none) */

  /* --- tables --- */

  /**
   * **facts**
   * - Table in database
   */
  export namespace facts {
    export type Table = 'facts';
    export interface Selectable {
      /**
      * **facts.id**
      * - `int4` in database
      * - Generated column
      */
    id: number;
      /**
      * **facts.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing: string;
      /**
      * **facts.fact**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    fact: string;
      /**
      * **facts.inactive**
      * - `bool` in database
      * - `NOT NULL`, default: `false`
      */
    inactive: boolean;
    }
    export interface JSONSelectable {
      /**
      * **facts.id**
      * - `int4` in database
      * - Generated column
      */
    id: number;
      /**
      * **facts.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing: string;
      /**
      * **facts.fact**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    fact: string;
      /**
      * **facts.inactive**
      * - `bool` in database
      * - `NOT NULL`, default: `false`
      */
    inactive: boolean;
    }
    export interface Whereable {
      /**
      * **facts.id**
      * - `int4` in database
      * - Generated column
      */
    id?: number | db.Parameter<number> | db.SQLFragment | db.ParentColumn | db.SQLFragment<any, number | db.Parameter<number> | db.SQLFragment | db.ParentColumn>;
      /**
      * **facts.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing?: string | db.Parameter<string> | db.SQLFragment | db.ParentColumn | db.SQLFragment<any, string | db.Parameter<string> | db.SQLFragment | db.ParentColumn>;
      /**
      * **facts.fact**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    fact?: string | db.Parameter<string> | db.SQLFragment | db.ParentColumn | db.SQLFragment<any, string | db.Parameter<string> | db.SQLFragment | db.ParentColumn>;
      /**
      * **facts.inactive**
      * - `bool` in database
      * - `NOT NULL`, default: `false`
      */
    inactive?: boolean | db.Parameter<boolean> | db.SQLFragment | db.ParentColumn | db.SQLFragment<any, boolean | db.Parameter<boolean> | db.SQLFragment | db.ParentColumn>;
    }
    export interface Insertable {
      /**
      * **facts.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing: string | db.Parameter<string> | db.SQLFragment;
      /**
      * **facts.fact**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    fact: string | db.Parameter<string> | db.SQLFragment;
      /**
      * **facts.inactive**
      * - `bool` in database
      * - `NOT NULL`, default: `false`
      */
    inactive?: boolean | db.Parameter<boolean> | db.DefaultType | db.SQLFragment;
    }
    export interface Updatable {
      /**
      * **facts.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing?: string | db.Parameter<string> | db.SQLFragment | db.SQLFragment<any, string | db.Parameter<string> | db.SQLFragment>;
      /**
      * **facts.fact**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    fact?: string | db.Parameter<string> | db.SQLFragment | db.SQLFragment<any, string | db.Parameter<string> | db.SQLFragment>;
      /**
      * **facts.inactive**
      * - `bool` in database
      * - `NOT NULL`, default: `false`
      */
    inactive?: boolean | db.Parameter<boolean> | db.DefaultType | db.SQLFragment | db.SQLFragment<any, boolean | db.Parameter<boolean> | db.DefaultType | db.SQLFragment>;
    }
    export type UniqueIndex = 'facts_pkey' | 'facts_thing_fact_key';
    export type Column = keyof Selectable;
    export type OnlyCols<T extends readonly Column[]> = Pick<Selectable, T[number]>;
    export type SQLExpression = Table | db.ColumnNames<Updatable | (keyof Updatable)[]> | db.ColumnValues<Updatable> | Whereable | Column | db.ParentColumn | db.GenericSQLExpression;
    export type SQL = SQLExpression | SQLExpression[];
  }

  /**
   * **karma**
   * - Table in database
   */
  export namespace karma {
    export type Table = 'karma';
    export interface Selectable {
      /**
      * **karma.id**
      * - `int4` in database
      * - Generated column
      */
    id: number;
      /**
      * **karma.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing: string;
      /**
      * **karma.value**
      * - `int4` in database
      * - `NOT NULL`, default: `0`
      */
    value: number;
    }
    export interface JSONSelectable {
      /**
      * **karma.id**
      * - `int4` in database
      * - Generated column
      */
    id: number;
      /**
      * **karma.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing: string;
      /**
      * **karma.value**
      * - `int4` in database
      * - `NOT NULL`, default: `0`
      */
    value: number;
    }
    export interface Whereable {
      /**
      * **karma.id**
      * - `int4` in database
      * - Generated column
      */
    id?: number | db.Parameter<number> | db.SQLFragment | db.ParentColumn | db.SQLFragment<any, number | db.Parameter<number> | db.SQLFragment | db.ParentColumn>;
      /**
      * **karma.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing?: string | db.Parameter<string> | db.SQLFragment | db.ParentColumn | db.SQLFragment<any, string | db.Parameter<string> | db.SQLFragment | db.ParentColumn>;
      /**
      * **karma.value**
      * - `int4` in database
      * - `NOT NULL`, default: `0`
      */
    value?: number | db.Parameter<number> | db.SQLFragment | db.ParentColumn | db.SQLFragment<any, number | db.Parameter<number> | db.SQLFragment | db.ParentColumn>;
    }
    export interface Insertable {
      /**
      * **karma.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing: string | db.Parameter<string> | db.SQLFragment;
      /**
      * **karma.value**
      * - `int4` in database
      * - `NOT NULL`, default: `0`
      */
    value?: number | db.Parameter<number> | db.DefaultType | db.SQLFragment;
    }
    export interface Updatable {
      /**
      * **karma.thing**
      * - `text` in database
      * - `NOT NULL`, no default
      */
    thing?: string | db.Parameter<string> | db.SQLFragment | db.SQLFragment<any, string | db.Parameter<string> | db.SQLFragment>;
      /**
      * **karma.value**
      * - `int4` in database
      * - `NOT NULL`, default: `0`
      */
    value?: number | db.Parameter<number> | db.DefaultType | db.SQLFragment | db.SQLFragment<any, number | db.Parameter<number> | db.DefaultType | db.SQLFragment>;
    }
    export type UniqueIndex = 'karma_pkey' | 'karma_thing_key';
    export type Column = keyof Selectable;
    export type OnlyCols<T extends readonly Column[]> = Pick<Selectable, T[number]>;
    export type SQLExpression = Table | db.ColumnNames<Updatable | (keyof Updatable)[]> | db.ColumnValues<Updatable> | Whereable | Column | db.ParentColumn | db.GenericSQLExpression;
    export type SQL = SQLExpression | SQLExpression[];
  }

  /* --- aggregate types --- */

  export namespace public {  
    export type Table = facts.Table | karma.Table;
    export type Selectable = facts.Selectable | karma.Selectable;
    export type JSONSelectable = facts.JSONSelectable | karma.JSONSelectable;
    export type Whereable = facts.Whereable | karma.Whereable;
    export type Insertable = facts.Insertable | karma.Insertable;
    export type Updatable = facts.Updatable | karma.Updatable;
    export type UniqueIndex = facts.UniqueIndex | karma.UniqueIndex;
    export type Column = facts.Column | karma.Column;
  
    export type AllBaseTables = [facts.Table, karma.Table];
    export type AllForeignTables = [];
    export type AllViews = [];
    export type AllMaterializedViews = [];
    export type AllTablesAndViews = [facts.Table, karma.Table];
  }



  /* === global aggregate types === */

  export type Schema = 'public';
  export type Table = public.Table;
  export type Selectable = public.Selectable;
  export type JSONSelectable = public.JSONSelectable;
  export type Whereable = public.Whereable;
  export type Insertable = public.Insertable;
  export type Updatable = public.Updatable;
  export type UniqueIndex = public.UniqueIndex;
  export type Column = public.Column;

  export type AllSchemas = ['public'];
  export type AllBaseTables = [...public.AllBaseTables];
  export type AllForeignTables = [...public.AllForeignTables];
  export type AllViews = [...public.AllViews];
  export type AllMaterializedViews = [...public.AllMaterializedViews];
  export type AllTablesAndViews = [...public.AllTablesAndViews];


  /* === lookups === */

  export type SelectableForTable<T extends Table> = {
    "facts": facts.Selectable;
    "karma": karma.Selectable;
  }[T];

  export type JSONSelectableForTable<T extends Table> = {
    "facts": facts.JSONSelectable;
    "karma": karma.JSONSelectable;
  }[T];

  export type WhereableForTable<T extends Table> = {
    "facts": facts.Whereable;
    "karma": karma.Whereable;
  }[T];

  export type InsertableForTable<T extends Table> = {
    "facts": facts.Insertable;
    "karma": karma.Insertable;
  }[T];

  export type UpdatableForTable<T extends Table> = {
    "facts": facts.Updatable;
    "karma": karma.Updatable;
  }[T];

  export type UniqueIndexForTable<T extends Table> = {
    "facts": facts.UniqueIndex;
    "karma": karma.UniqueIndex;
  }[T];

  export type ColumnForTable<T extends Table> = {
    "facts": facts.Column;
    "karma": karma.Column;
  }[T];

  export type SQLForTable<T extends Table> = {
    "facts": facts.SQL;
    "karma": karma.SQL;
  }[T];

}