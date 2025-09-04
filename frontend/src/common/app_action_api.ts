import { models } from '../../wailsjs/go/models';
import { ProcessAction } from '../../wailsjs/go/ui/appUIActionApiStruct';
import { LogDebug } from '../../wailsjs/runtime';
import { IActionApi } from './app_backend_api';
import { AppActionObj } from './types';
import AppActionObjWrapper = models.AppActionObjWrapper;

export class AppActionApi implements IActionApi {
    async processAction(actionObj: AppActionObj): Promise<string> {
        const wrapper = AppActionObjWrapper.createFrom({ ...actionObj });
        try {
            return await ProcessAction(wrapper);
        } catch (error) {
            LogDebug('Failed to process action ' + actionObj);
            throw error;
        }
    }
}
