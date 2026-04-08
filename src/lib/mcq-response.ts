import type {
	McChoiceDto,
	McQuestionDto,
	McQuestionListResult,
	McQuestionSummary,
} from "@/lib/services/mc-question-service";

export type McChoiceJson = {
	id: string;
	text: string;
	isCorrect: boolean;
	sortOrder: number;
};

export type McQuestionJson = {
	id: string;
	description: string;
	questionText: string;
	createdAt: string;
	updatedAt: string;
	choices: McChoiceJson[];
};

export type McQuestionSummaryJson = {
	id: string;
	description: string;
	questionText: string;
	choiceCount: number;
	createdAt: string;
	updatedAt: string;
};

export function mcChoiceToJson(c: McChoiceDto): McChoiceJson {
	return {
		id: c.id,
		text: c.text,
		isCorrect: c.isCorrect,
		sortOrder: c.sortOrder,
	};
}

export function mcQuestionToJson(q: McQuestionDto): McQuestionJson {
	return {
		id: q.id,
		description: q.description,
		questionText: q.questionText,
		createdAt: q.createdAt,
		updatedAt: q.updatedAt,
		choices: q.choices.map(mcChoiceToJson),
	};
}

export function mcQuestionSummaryToJson(s: McQuestionSummary): McQuestionSummaryJson {
	return {
		id: s.id,
		description: s.description,
		questionText: s.questionText,
		choiceCount: s.choiceCount,
		createdAt: s.createdAt,
		updatedAt: s.updatedAt,
	};
}

export function mcQuestionListToJson(result: McQuestionListResult): {
	items: McQuestionSummaryJson[];
	page: number;
	pageSize: number;
	totalCount: number;
} {
	return {
		items: result.items.map(mcQuestionSummaryToJson),
		page: result.page,
		pageSize: result.pageSize,
		totalCount: result.totalCount,
	};
}
