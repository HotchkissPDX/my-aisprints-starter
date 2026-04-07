"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
} from "react-hook-form";

import { cn } from "@/lib/utils";

const Form = FormProvider;

type FormFieldContextValue = {
	name: string;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(
	null,
);

const FormItemContext = React.createContext<{ id: string } | null>(null);

function FormField<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
}

function useFormField() {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState, formState } = useFormContext();

	if (!fieldContext) {
		throw new Error("useFormField must be used within <FormField>");
	}
	if (!itemContext) {
		throw new Error("useFormField must be used within <FormItem>");
	}

	const fieldState = getFieldState(fieldContext.name, formState);

	return {
		id: itemContext.id,
		name: fieldContext.name,
		formItemId: itemContext.id,
		formDescriptionId: `${itemContext.id}-description`,
		formMessageId: `${itemContext.id}-message`,
		...fieldState,
	};
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();
	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				data-slot="form-item"
				className={cn("grid gap-2", className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

const FormLabel = React.forwardRef<
	React.ElementRef<typeof LabelPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
	const { error, formItemId } = useFormField();
	return (
		<LabelPrimitive.Root
			ref={ref}
			data-slot="form-label"
			className={cn(
				"text-sm font-medium leading-none",
				error && "text-red-600 dark:text-red-400",
				className,
			)}
			htmlFor={formItemId}
			{...props}
		/>
	);
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();
	return (
		<Slot
			ref={ref}
			id={formItemId}
			aria-describedby={
				!error
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			{...props}
		/>
	);
});
FormControl.displayName = "FormControl";

function FormDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();
	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)}
			{...props}
		/>
	);
}

const FormMessage = React.forwardRef<
	HTMLParagraphElement,
	React.ComponentPropsWithoutRef<"p">
>(({ className, children, ...props }, ref) => {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error.message ?? "") : children;
	if (!body) {
		return null;
	}
	return (
		<p
			ref={ref}
			id={formMessageId}
			data-slot="form-message"
			className={cn("text-sm font-medium text-red-600 dark:text-red-400", className)}
			{...props}
		>
			{body}
		</p>
	);
});
FormMessage.displayName = "FormMessage";

export {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
	useFormField,
};
