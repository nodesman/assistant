// src/UserState.ts
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

interface UserStateData {
  onboarding_completed: boolean;
}

export class UserState {
  private static instance: UserState;
  private state: UserStateData;
  private statePath: string;

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.statePath = path.join(userDataPath, 'user-state.json');
    this.state = {
      onboarding_completed: false,
    };
  }

  public static async getInstance(): Promise<UserState> {
    if (!UserState.instance) {
      UserState.instance = new UserState();
      await UserState.instance.load();
    }
    return UserState.instance;
  }

  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.statePath, 'utf8');
      this.state = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, which is fine on first launch.
        // The default state will be used and saved on the first change.
        await this.save();
      } else {
        console.error('Error loading user state:', error);
      }
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Error saving user state:', error);
    }
  }

  public getOnboardingStatus(): boolean {
    return this.state.onboarding_completed;
  }

  public async setOnboardingCompleted(status: boolean): Promise<void> {
    this.state.onboarding_completed = status;
    await this.save();
  }
}
