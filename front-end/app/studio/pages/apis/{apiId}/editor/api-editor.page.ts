/**
 * @license
 * Copyright 2017 JBoss Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, OnInit, Inject, ViewChild, Injectable, HostListener} from "@angular/core";
import {ActivatedRoute, Router, CanDeactivate} from "@angular/router";
import {ApiDefinition} from "../../../../models/api.model";
import {IApisService} from "../../../../services/apis.service";
import {ApiEditorComponent} from "./editor.component";
import {ModalDirective} from "ng2-bootstrap";

@Component({
    moduleId: module.id,
    selector: "api-editor-page",
    templateUrl: "api-editor.page.html",
    styleUrls: ["api-editor.page.css"]
})
export class ApiEditorPageComponent implements OnInit {

    public apiDefinition: ApiDefinition;

    protected isDirty: boolean = false;
    protected isSaving: boolean = false;

    @ViewChild("apiEditor") apiEditor: ApiEditorComponent;
    @ViewChild("discardChangesModal") public discardChangesModal: ModalDirective;
    private discardResolver: any;

    /**
     * Constructor.
     * @param router
     * @param route
     * @param apis
     */
    constructor(private router: Router,
                private route: ActivatedRoute,
                @Inject(IApisService) private apis: IApisService) {
        this.apiDefinition = new ApiDefinition();
    }

    public ngOnInit(): void {
        this.route.data.subscribe( value => {
            this.apiDefinition = value["apiDefinition"];
            console.info("[ApiEditorPageComponent] API definition resolved successfully.");
        });
    }

    /**
     * Called when the API editor indicates a change in "dirtiness".
     * @param dirty
     */
    public onEditorDirty(dirty: boolean): void {
        this.isDirty = dirty;
    }

    /**
     * Called when the user chooses to save the editor changes back to their source repository (e.g. commit
     * to GitHub).
     */
    public saveChange(saveInfo: any): void {
        console.info("[ApiEditorPageComponent] Saving editor changes!");
        this.isSaving = true;
        let apiDef: ApiDefinition = this.apiEditor.getUpdatedApiDefinition();
        this.apis.updateApiDefinition(apiDef, saveInfo.summary, saveInfo.description).then(definition => {
            this.apiEditor.reset();
            this.apiDefinition = definition;
            this.isSaving = false;
        }).catch( error => {
            // TODO do something interesting with this error!
        });
    }

    public isEditorDirty(): boolean {
        return this.isDirty;
    }

    /**
     * Called when the user wants to navigate away from a dirty editor.
     */
    public askToLeave(): Promise<boolean> {
        this.discardChangesModal.show();
        return new Promise<boolean>( resolve => {
            this.discardResolver = resolve;
        });
    }

    /**
     * Called when the user allows the navigation (discards editor changes).
     */
    public allowNavigate(): void {
        this.discardChangesModal.hide();
        this.discardResolver(true);
    }

    /**
     * Called when the user cancels the navigation.
     */
    public cancelNavigate(): void {
        this.discardChangesModal.hide();
        this.discardResolver(false);
    }

    @HostListener("window:beforeunload", ["$event"])
    public onBeforeUnload($event: any): string {
        if (this.isEditorDirty()) {
            var dialogText = "If you leave you may lose unsaved changes.  Do you really want to leave?";
            $event.returnValue = dialogText;
            return dialogText;
        } else {
            return null;
        }
    }
}


/**
 * Guards against the user losing changes to the editor.
 */
@Injectable()
export class ApiEditorPageGuard implements CanDeactivate<ApiEditorPageComponent> {

    /**
     * Called by angular 2 to determine whether the user is allowed to navigate away from the
     * editor.
     * @param component
     */
    public canDeactivate(component: ApiEditorPageComponent): Promise<boolean> | boolean {
        if (!component.isEditorDirty()) {
            return true;
        }
        return component.askToLeave();
    }

}