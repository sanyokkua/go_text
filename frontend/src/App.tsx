import TopBarWidget from './widgets/bars/TopBarWodget';
import BottomBarWidget from './widgets/bars/BottomBarWidget';
import { TabWidget } from './widgets/tabs/common/TabWidget';
import IOPaneWidget from './widgets/combined/IOPaneWidget';
import ProofreadingWidget from './widgets/tabs/ProofreadingWidget';
import FormattingWidget from './widgets/tabs/FormattingWidget';
import TranslatingWidget from './widgets/tabs/TranslatingWidget';
import { SelectItem } from './widgets/inputs/Select';
import { TabContentBtn } from './widgets/tabs/common/TabContentWidget';

const ENGLISH: SelectItem = {itemId: 'eng', displayText:'English'};
const UA: SelectItem = {itemId: 'ua', displayText:'Ukrainian'};
const CROATIAN: SelectItem = {itemId: 'croat', displayText:'Croatian'};
const inputLangs: SelectItem[] = [ENGLISH, UA, CROATIAN];
const outputLangs: SelectItem[] = [ENGLISH, UA, CROATIAN];
const proofreadingButtons: TabContentBtn[] = [{btnId:'proof', btnName: "Proofread"}, {btnId:'semi', btnName: "Semiformal"},{btnId:'formal', btnName: "Formal"},{btnId:'casual', btnName: "Casual"}];
const formattingButtons: TabContentBtn[] = [{btnId:'email', btnName: "Email"}, {btnId:'article', btnName: "Article"},{btnId:'post', btnName: "Social Post"}];
const translateButtons: TabContentBtn[] = [{btnId:'translate', btnName: "Translate"}, {btnId:'tr_tbl', btnName: "Translate Table"}];

function App() {
    return (
        <div id="App">
            <TopBarWidget onButtonClick={() => {
                console.log("Settings Clicked")
            }}/>
            <div>
                <IOPaneWidget
                    inputContent={''}
                    onInputContentChange={(inputContent: string) => {console.log(inputContent)}}
                    onInputPaste={()=>console.log("Input Paste")}
                    onInputClear={()=>console.log("Input Clear")}
                    outputContent={''}
                    onOutputContentChange={()=>console.log("Output Paste")}
                    onOutputClear={()=>console.log("Output Clear")}
                    onOutputCopy={()=>console.log("Output Copy")}
                />
                <TabWidget tabs={['Proofreading', 'Formatting', 'Translating']}>
                    <ProofreadingWidget buttons={proofreadingButtons} onBtnClick={(btn)=>console.log(btn)}/>
                    <FormattingWidget buttons={formattingButtons} onBtnClick={(btn)=>console.log(btn)}/>
                    <TranslatingWidget
                        buttons={translateButtons}
                        onBtnClick={(btn)=>console.log(btn)}
                        inputLanguages={inputLangs}
                        outputLanguages={outputLangs}
                        selectedInputLanguage={ENGLISH}
                        selectedOutputLanguage={UA}
                        onInputLanguageChanged={(selectItem: SelectItem) => {console.log(selectItem)}}
                        onOutputLanguageChanged={(selectItem: SelectItem) => {console.log(selectItem)}}
                    />
                </TabWidget>
            </div>
            <BottomBarWidget/>
        </div>
    )
}

export default App
