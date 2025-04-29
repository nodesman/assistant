// src/UserInterface.ts
import inquirer from 'inquirer';

export class UserInterface {

    async promptSelection<T>(message: string, choices: T[]): Promise<T> {
        const { selection } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selection',
                message,
                choices: choices.map(choice => ({ name: String(choice), value: choice })), // Ensure choices are presented correctly
                 pageSize: 15, // Show more items at once
            },
        ]);
        return selection;
    }

    async promptInput(message: string, defaultValue?: string): Promise<string> {
        const { input } = await inquirer.prompt([
            {
                type: 'input',
                name: 'input',
                message,
                default: defaultValue,
            },
        ]);
        return input;
    }

    async promptConfirm(message: string, defaultValue: boolean = true): Promise<boolean> {
        const { confirmation } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmation',
                message,
                default: defaultValue,
            },
        ]);
        return confirmation;
    }

    displayMessage(message: string): void {
        console.log(message);
    }

    displayError(message: string, error?: any): void {
        console.error(`ERROR: ${message}`, error || '');
    }

     displayReflection(reflection: string): void {
         console.log("\n--- AI Reflection ---");
         console.log(reflection);
         console.log("--- End Reflection ---\n");
     }
}