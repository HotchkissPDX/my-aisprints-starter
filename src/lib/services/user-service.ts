import "server-only";

import { executeQueryFirst } from "@/lib/d1-client";
import { isUniqueConstraintError } from "@/lib/d1-errors";

export type PublicUser = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
};

export type UserRow = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	password_hash: string;
	created_at: string;
	updated_at: string;
};

function toPublicUser(row: {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
}): PublicUser {
	return {
		id: row.id,
		email: row.email,
		firstName: row.first_name,
		lastName: row.last_name,
	};
}

export class EmailInUseError extends Error {
	readonly code = "EMAIL_IN_USE" as const;
	constructor() {
		super("Email already registered");
		this.name = "EmailInUseError";
	}
}

/**
 * Inserts a user. Relies on UNIQUE(email); maps constraint violation to {@link EmailInUseError}.
 */
export async function createUser(
	db: D1Database,
	input: {
		firstName: string;
		lastName: string;
		email: string;
		passwordHash: string;
	},
): Promise<PublicUser> {
	const sql = `
    INSERT INTO users (first_name, last_name, email, password_hash)
    VALUES (?, ?, ?, ?)
    RETURNING id, first_name, last_name, email
  `;
	try {
		const row = await executeQueryFirst<{
			id: string;
			first_name: string;
			last_name: string;
			email: string;
		}>(db, sql, input.firstName, input.lastName, input.email, input.passwordHash);
		if (!row) {
			throw new Error("Insert returned no row");
		}
		return toPublicUser(row);
	} catch (e) {
		if (isUniqueConstraintError(e)) {
			throw new EmailInUseError();
		}
		throw e;
	}
}

export async function getUserByEmailWithCredentials(
	db: D1Database,
	email: string,
): Promise<UserRow | null> {
	return executeQueryFirst<UserRow>(
		db,
		`
    SELECT id, first_name, last_name, email, password_hash, created_at, updated_at
    FROM users
    WHERE email = ?
  `,
		email,
	);
}
