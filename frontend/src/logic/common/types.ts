export type Color =
    | ''
    | 'black-color'
    | 'white-color'
    | 'primary-color'
    | 'primary-container-color'
    | 'secondary-color'
    | 'secondary-container-color'
    | 'tertiary-color'
    | 'tertiary-container-color'
    | 'error-color'
    | 'error-container-color'
    | 'surface-color'
    | 'surface-dim-color'
    | 'info-color'
    | 'info-container-color'
    | 'success-color'
    | 'success-container-color'
    | 'warning-color'
    | 'warning-container-color';
export type Size = 'tiny' | 'small' | 'default' | 'large';

export type KeyValuePair = { id: string; key: string; value: string };
export interface ActionIdentifier {
    id: string;
    name: string;
}

export const UnknownError = 'Unknown error';
