// Type definitions for webgme
// Project: https://webgme.org
// Definitions by: Fred Eisele <https://github.com/phreed>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

// Based on examination of
// Example: https://github.com/typed-typings/env-node/blob/master/0.12/node.d.ts
// Source: https://raw.githubusercontent.com/phreed/typed-npm-webgme/master/webgme.d.ts
// Documentation: https://editor.webgme.org/docs/source/index.html
// https://github.com/webgme/webgme/tree/master/config

declare module "webgme" {
    export class Standalone {
        constructor(config: any);
        start(fn: any): void;
        stop(): void;
    }
    export interface GmeAuth {
        unload(): Promise<void>,
    }

    export interface SafeStorage {
        openDatabase(): Promise<void>,
        closeDatabase(): Promise<void>,
        openProject(data: any): Promise<GmeClasses.ProjectInterface>,
    }
    export function addToRequireJsPaths(gmeConfig: any): void;
    export function standaloneServer(gmeConfig: any): void;
    export function getGmeAuth(gmeConfig: any): Promise<GmeAuth>;
    export function getStorage(logger: Global.GmeLogger, gmeConfig: any, gmeAtuh: any): SafeStorage;

}

declare module "blob/BlobMetadata" {
    export default class BlobMetadata implements Blobs.BlobMetadata {
        constructor();
        name: string;
        size: number;
        mime: string;
        context: any;
        contentType: string;
    }
}



declare module "plugin/PluginConfig" {
    export = GmeConfig.PluginConfig;
}

declare module "webgme/config/config.default" {
    export = GmeConfig.config;
}

declare module "webgme/common" {
    export = GmeCommon;
}

declare module "common/util/canon" {
    export = GmeUtil.CANON;
}

declare module "common/util/assert" {
    export = GmeUtil.ASSERT;
}

declare module "js/PanelBase/PanelBase" {
    export = GmePanel.PanelBase;
}

declare module "js/PanelBase/PanelBaseWithHeader" {
    export = GmePanel.PanelBaseWithHeader;
}

declare module "js/PanelManager/IActivePanel" {
    export = GmePanel.IActivePanel;
}

declare module "js/NodePropertyNames" {
    var names: Gme.NodePropertyNames;
    export = names;
}

declare module "js/RegistryKeys" {
    const keys: Gme.RegistryKeys;
    export = keys;
}

declare module "js/Utils/GMEConcepts" {
    export = Gme.Concepts;
}

declare module "js/Utils/PreferencesHelper" {
    const helper: Gme.PreferenceHelper;
    export = helper;
}

declare module "plugin/PluginBase" {
    // const pb: GmePlugin.PluginBase;
    export = GmePlugin.PluginBase;
}



declare namespace Gme {

    interface NodePropertyNames {
        Attributes: {
            name: string;
        };
    }
    interface RegistryKeys {
        POSITION: string;
    }
    interface PreferenceHelper {
        getPreferences(): PreferenceHelper;
    }
    export namespace Concepts {
        function isConnection(node: Core.Node): boolean;

        interface ConnectionStyle {
            startArrow: string;
            endArrow: string;
        }

        interface ComposeChain {
            objId: string;
            subCompId: undefined | string;
        }

        interface ConnectionCollectionPair {
            sources: ComposeChain[];
            destinations: ComposeChain[];
        }
    }
    type Connection = any;

    interface Project {
        name: string;
        /** should always be true */
        read: boolean;
        write: boolean;
        delete: boolean;
        branches: {
            [key: string]: string;
        }
    }
    type ProjectResult = Project[] | { [key: string]: Project };

    interface Pos2D {
        x: number;
        y: number;
    }
    interface VisualizerControl {

    }
    interface ObjectDescriptor {
        id: string;
        name: string;
        childrenIds: string[];
        parentId: string;
        isConnection: boolean;
        childrenNum: number;
        position: number;
        source: string;
        target: string;
        pointers: GmeCommon.Dictionary<GmeCommon.Pointer>;
        srcPos: Pos2D;
        dstPos: Pos2D;
        srcObjId: string;
        dstObjId: string;

        control?: VisualizerControl;
        metaInfo?: GmeCommon.Dictionary<string>;
        preferencesHelper?: Gme.PreferenceHelper;
        srcSubCompId?: string;
        dstSubCompId?: string;
        reconnectable?: boolean;
        editable?: boolean;
    }
    /**
     * primary values are: 'load' 'update' 'unload'
     */
    export type TerritoryEventType = "load" | "unload" | "update" | "complete" | "incomplete";

    interface Event {
        id?: string;
        etype: TerritoryEventType;
        eid: string;
    }
    /**
     * The eventHandler is invoked whenever there are 
     * changes to the nodes matching any of the patterns.
     *  There are three cases when it is triggered:
     *   - updateTerritory was invoked by us.
     *   - Another client made changes to nodes within the territory.
     *   - We made changes to any of the nodes (via the setters).
     * 
     *  * ('load')
     * The node is loaded and we have access to it.
     * It was either just created or this is the initial updateTerritory we invoked.
     *  * ('update') 
     * There were changes to the node (some might not apply to your application).
     * The node is still loaded and we have access to it.
     *  * ('unload')
     * The node was removed from the model (we can no longer access it).
     * We still get the path/id via events[i].eid
     *  * (else)
     * "Technical events" not used.
     */
    interface TerritoryEventHandler {
        (event: Event[]): void;
    }
    interface ChildCreationParams {
        parentId: string;
        baseId: string;
    }
    interface TransactionResult {
        hash: string;
        /**
         * may be: 'SYNCED' or 'FORKED'
         */
        status: string;
    }

    interface AttributeSchema {
        /** integer, float, asset, string */
        type: string;
        /** array of possible/allowed values */
        enum: string[];
    }
    interface ChildType {
        /**
         * The id of the loaded new child type
         */
        id: string;
        /**
         * the minimum necessary amount of this type of child
         */
        min: number;
        /**
         * the maximum allowed children of this type
         */
        max: number;
    }
    interface PointerMeta {
        /**
         * the maximum allowed targets for a pointer is 1.
         * more than 1 requires a set.
         */
        max: number;
        items: { id: string }[];
    }

    type TerritoryId = Core.GUID;
    /**
     * A pattern is a filter for nodes to load/watch.
     * 
     * The root-node (with path '') always exists in a 
     * project so it is the safest starting point. 
     * We specify the number of levels in the containment
     * hierarchy to load.
     * It can be set to any positive integer [0, Inf).
     */
    interface TerritoryPattern {
        children: number;
    }

    /**
     * https://github.com/webgme/webgme/wiki/GME-Client-API
     * 
     * https://github.com/webgme/webgme/blob/master/src/client/js/client.js
     */
    class Client {
        constructor();
        /**
         * Connecting to the webGME database.
         */
        connectToDatabase(callback: GmeCommon.ResultCallback<Connection>): void;
        /**
         * asIndexed true to get an object indexed by project ids.
         */
        getProjectsAndBranches(asIndexed: boolean, callback: GmeCommon.ResultCallback<ProjectResult>): void;
        /**
         * The client opens a project and a branch and 
         * from there we can start registering for node events.
         */
        selectProject(projectId: string, branchName: string, callback: GmeCommon.ResultCallback<any>): void;
        /**
         * Add a user associated with the pattern and an event-handler.
         * The eventHandler is invoked whenever there are changes 
         * to the nodes matching any of the patterns.
         * There are three cases when it is triggered:
         * - **updateTerritory** was invoked by us.
         * - Another client made changes to nodes within the territory.
         * - We made changes to any of the nodes (via the setters).
         * 
         * Returns the user-id.
         */
        addUI(pattern: any, eventHandler: TerritoryEventHandler, guid?: TerritoryId): string;
        /**
         * Initiate the initial load of nodes matching the patterns.
         */
        updateTerritory(userId: string, patterns: GmeCommon.Dictionary<TerritoryPattern>): void;
        /**
         * When we are no longer interested in the the 
         * nodes for the userId so we remove the user. 
         * This will prevent further invocations of
         * our eventHandler and it will be cleaned up.
         */
        removeUI(userId: string): void;

        /**
         * Typically called from within the event-handler.
         */
        getNode(nodeId: GmeCommon.NodeId): Core.Node;
        /**
         * Get an array of all the META nodes as nodeObjs.
         * Since these may change it is a good idea to invoke 
         * this each time the territory of the root changes.
         */
        getAllMetaNodes(): Core.Node[];

        setAttributes(nodeId: GmeCommon.NodeId, name: string, newName: string, message: string): void;
        createChild(params: ChildCreationParams, message: string): void;
        delMoreNodes(nodeIds: GmeCommon.NodeId[], message: string): void;

        /**
         * Transactions
         */
        startTransaction(message: string): void;
        setRegistry(nodeId: GmeCommon.NodeId, attr: string, property: any, message: string): void;
        completeTransaction(message: string, callback: GmeCommon.ResultCallback<TransactionResult>): void;

        /**
         * make a new pointer object.
         * The source and target should already be loaded.
         */
        makePointer(sourceNodeId: GmeCommon.NodeId, pointerName: string, targetNodeId: GmeCommon.NodeId, message: string): GmeCommon.Pointer;
        /**
        * assign a node to a set
        * The source and target should already be loaded.
        */
        addMember(sourceNodeId: GmeCommon.NodeId, targetNodeId: GmeCommon.NodeId, setName: string, message: string): GmeCommon.Pointer;

        getAllMetaNodes(): Core.Node[];
        setAttributeSchema(nodeId: string, name: string, schema: AttributeSchema): void;
        updateValidChildrenItem(nodeId: GmeCommon.NodeId, type: ChildType): void

        setPointerMeta(metaNodeId: GmeCommon.NodeId, newPointerName: string, meta: Gme.PointerMeta): void;

        /**
         * Creates a new core instance using the state of the client and loads the root node.
         */
        getCoreInstance(
            options: CoreInstanceOptions,
            callback: (err: Error, result: CoreInstanceResult) => void | Promise<void>
        ): void;

    }

    class ClientNode {
        _id: string;
        constructor(id: string, logger: Global.GmeLogger, state: any, storeNode: Function);
        constructor();
        getNode(id: GmeCommon.NodeId, logger: Global.GmeLogger, state: any, storeNode: Function): ClientNode;

        getParentId(): GmeCommon.NodeId;
        getId(): GmeCommon.NodeId;
        getRelid(): GmeCommon.RelId;
        getGuid(): Core.GUID;
        getChildrenIds(): GmeCommon.NodeId[];
        getBaseId(): GmeCommon.NodeId;
        isValidNewBase(basePath: GmeCommon.Path): boolean;
        isValidNewParent(parentPath: GmeCommon.Path): boolean;
        getInheritorIds(): GmeCommon.NodeId[];
        getAttribute(name: GmeCommon.Name): GmeCommon.OutAttr;
        getOwnAttribute(name: GmeCommon.Name): GmeCommon.OutAttr;
        getEditableAttribute(name: GmeCommon.Name): GmeCommon.OutAttr;
        getOwnEditableAttribute(name: GmeCommon.Name): GmeCommon.OutAttr;
        getRegistry(name: GmeCommon.Name): GmeCommon.Registry;
        getOwnRegistry(name: GmeCommon.Name): GmeCommon.Registry;
        getEditableRegistry(name: GmeCommon.Name): GmeCommon.Registry;
        getOwnEditableRegistry(name: GmeCommon.Name): GmeCommon.Registry;

        getPointer(name: GmeCommon.Name): GmeCommon.Pointer;
        getPointerId(name: GmeCommon.Name): GmeCommon.SetId;
        getOwnPointer(name: GmeCommon.Name): GmeCommon.Pointer;
        getOwnPointerId(name: GmeCommon.Name): GmeCommon.SetId;
        getPointerNames(): GmeCommon.Name[];
        getOwnPointerNames(): GmeCommon.Name[];

        getAttributeNames(): GmeCommon.Name[];
        getValidAttributeNames(): GmeCommon.Name[];
        getOwnAttributeNames(): GmeCommon.Name[];
        getOwnValidAttributeNames(): GmeCommon.Name[];

        getAttributeMeta(name: GmeCommon.Name): GmeCommon.AttrMeta;
        getRegistryNames(): GmeCommon.Name[];
        getOwnRegistryNames(): GmeCommon.Name[];

        /** Set */
        getMemberIds(setId: GmeCommon.SetId): GmeCommon.Path[];
        getSetNames(): GmeCommon.Name[];
        getMemberAttributeNames(setId: GmeCommon.SetId, memberId: GmeCommon.MemberId): GmeCommon.Name[];
        getMemberAttribute(setId: GmeCommon.SetId, memberId: GmeCommon.MemberId): GmeCommon.OutAttr;
        getEditableMemberAttribute(setId: GmeCommon.SetId, memberId: GmeCommon.MemberId, name: GmeCommon.Name): GmeCommon.OutAttr;
        getMemberRegistryNames(setId: GmeCommon.SetId, memberId: GmeCommon.MemberId): GmeCommon.Name[];
        getMemberRegistry(setId: GmeCommon.SetId, memberId: GmeCommon.MemberId, name: GmeCommon.Name): GmeCommon.Registry;
        getEditableMemberRegistry(setId: GmeCommon.SetId, memberId: GmeCommon.MemberId, name: GmeCommon.Name): GmeCommon.Registry;

        /** META */
        getValidChildrenTypes(): GmeCommon.NodeId[];
        getValildAttributeNames(): GmeCommon.Name[];
        isValidAttributeValueOf(name: GmeCommon.Name, value: any): boolean;
        getValidPointerNames(): GmeCommon.Name[];
        getValidSetNames(): GmeCommon.Name[];
        getConstraintNames(): GmeCommon.Name[];
        getOwnConstraintNames(): GmeCommon.Name[];
        getConstraint(name: GmeCommon.Name): Core.Constraint;
        toString(): string;

        getCollectionPaths(name: GmeCommon.Name): GmeCommon.Path[];
        getInstancePaths(): GmeCommon.Path[];
        getJsonMeta(): GmeCommon.Metadata[];

        isConnection(): boolean;
        isAbstract(): boolean;
        isLibraryRoot(): boolean;
        isLibraryElement(): boolean;
        getFullyQualifiedName(): GmeCommon.Name;
        getNamespace(): GmeCommon.Name;

        getLibraryGuid(): Core.GUID;
        getCrosscutsInfo(): GmeCommon.CrosscutsInfo;
        getValidChildrenTypesDetailed(aspect: GmeCommon.Aspect, noFilter: boolean): GmeCommon.Dictionary<any>;
        getValidSetMemberTypesDetailed(setName: GmeCommon.Name): { [key: string]: any };
        getMetaTypeId(): GmeCommon.NodeId | null;
        getBaseTypeId(): GmeCommon.NodeId | null;
        isMetaNode(): boolean;
        isTypeOf(typePath: GmeCommon.Path): boolean;
        isValidChildOf(parentPath: GmeCommon.Path): boolean;
        getValidChildrenIds(): GmeCommon.NodeId[];
        isValidTargetOf(sourcePath: GmeCommon.Path, name: GmeCommon.Name): boolean;
        getValidAspectNames(): GmeCommon.Name[];
        getOwnValidAspectNames(): GmeCommon.Name[];
        getAspectMeta(): GmeCommon.Metadata;

        /** MixIns */
        getMixinPaths(): GmeCommon.Path[];
        canSetAsMixin(mixinPath: GmeCommon.Path): boolean;
        isReadOnly(): boolean;
    }


    interface CoreInstanceOptions {
        commitHash: GmeCommon.MetadataHash;
        logger: Global.GmeLogger;
    }

    interface CoreInstanceResult {
        core: GmeClasses.Core;
        commitHash: GmeCommon.MetadataHash;
        rootNode: Core.Node;
        project: GmeClasses.ProjectInterface;
    }
}
declare const WebGMEGlobal: Global.WebGmeGlobal;

declare namespace GmeClasses {

    export type ArtifactCallback = (err: Error, result: Artifact) => void;

    export interface Artifact {
        name: GmeCommon.Name;
        blobClient: Blobs.BlobClient;
        descriptor: Blobs.BlobMetadata;

        constructor(name: GmeCommon.Name, blobClient: Blobs.BlobClient, descriptor: Blobs.BlobMetadata): void;

        /** Adds content to the artifact as a file. */
        addFile: {
            (name: GmeCommon.Name, content: Blobs.ObjectBlob, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (name: GmeCommon.Name, content: Blobs.ObjectBlob): Promise<GmeCommon.MetadataHash>;
        }
        /** Adds files as soft-link. */
        addFileAsSoftLink: {
            (name: GmeCommon.Name, content: Blobs.ObjectBlob, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (name: GmeCommon.Name, content: Blobs.ObjectBlob): Promise<GmeCommon.MetadataHash>;
        }
        /** Adds multiple files. */
        addFiles: {
            (files: { [name: string]: Blobs.ObjectBlob }, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash[]>): void;
            (files: { [name: string]: Blobs.ObjectBlob }): Promise<GmeCommon.MetadataHash[]> | Promise<string>;
        }
        /** Adds multiple files as soft-links. */
        addFilesAsSoftLinks: {
            (files: { [name: string]: Blobs.ObjectBlob }, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash[]>): void;
            (files: { [name: string]: Blobs.ObjectBlob }): Promise<GmeCommon.MetadataHash[]>;
        }
        /** Adds a metadataHash to the artifact using the given file path. */
        addMetadataHash: {
            (name: GmeCommon.Name, metadataHash: GmeCommon.MetadataHash, size: number, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (name: GmeCommon.Name, metadataHash: GmeCommon.MetadataHash, size?: number): Promise<GmeCommon.MetadataHash>;

            (objectHashes: { [name: string]: string }, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (objectHashes: { [name: string]: string }): Promise<GmeCommon.MetadataHash>;
        }
        /** Adds metadataHashes to the artifact using the given file paths. */
        addMetadataHashes: {
            (name: GmeCommon.Name, metadataHash: GmeCommon.MetadataHash, size: number, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash[]>): void;
            (name: GmeCommon.Name, metadataHash: GmeCommon.MetadataHash, size?: number): Promise<GmeCommon.MetadataHash[]>;

            (objectHashes: { [name: string]: string }, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash[]>): void;
            (objectHashes: { [name: string]: string }): Promise<GmeCommon.MetadataHash[]>;
        }
        /** Adds a metadataHash to the artifact using the given file path. */
        addObjectHash: {
            (name: GmeCommon.Name, metadataHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (name: GmeCommon.Name, metadataHash: GmeCommon.MetadataHash): Promise<GmeCommon.MetadataHash>;
        }
        /** Adds metadataHashes to the artifact using the given file paths. */
        addObjectHashes: {
            (objectHashes: { [name: string]: string }, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash[]>): void;
            (objectHashes: { [name: string]: string }): Promise<GmeCommon.MetadataHash[]>;
        }
        /** Saves this artifact and uploads the metadata to the server's storage. */
        save: {
            (callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (message?: string): Promise<GmeCommon.MetadataHash>;
        }
    }
    /**
     commitHash - metadataHash of the commit.
     status - storage.constants./SYNCED/FORKED/MERGED
    */
    export interface Commit {
        commitHash: GmeCommon.MetadataHash;
        status: string;
        branchName: string;
    }

    export interface Result {
        success: boolean;
        /** array of PluginMessages */
        messages: string[];
        /** array of hashes */
        artifacts: GmeCommon.ArtifactHash[];
        pluginName: string;
        startTime: Date;
        finishTime: Date;
        error: Error;
        projectId: any;
        commits: any[];

        /**
        * Gets the success flag of this result object
        */
        getSuccess(): boolean;
        /**
        * Sets the success flag of this result.
        */
        setSuccess(value: boolean): void;
        /**
        * Returns with the plugin messages.
        */
        getMessages(): GmeCommon.Message[];
        /**
        * Adds a new plugin message to the messages list.
        */
        addMessage(pluginMessage: GmeCommon.Message): void;
        /**
        * Returns the plugin artifacts.
        */
        getArtifacts(): Artifact[];
        /**
        * Adds a saved artifact to the result - linked via its metadataHash.
        * Takes the metadataHash of saved artifact.
        */
        addArtifact(metadataHash: GmeCommon.MetadataHash): void;
        /**
        * Adds a commit to the commit container.
        */
        addCommit(commitData: Commit): void;
        /**
        * Gets the name of the plugin to which the result object belongs.
        */
        getPluginName(): string;
        //------------------------------------------
        // Methods used by the plugin manager
        //-----------------------------------------
        /**
        * Sets the name of the plugin to which the result object belongs to.
        */
        setPluginName(pluginName: string): string;
        /**
        * Sets the name of the projectId the result was generated from.
        */
        setProjectId(projectId: string): void;
        /**
        * Gets the ISO 8601 representation of the time when the plugin started its execution.
        */
        getStartTime(): GmeCommon.ISO8601;
        /**
        * Sets the ISO 8601 representation of the time when the plugin started its execution.
        */
        setStartTime(time: GmeCommon.ISO8601): void;
        /**
        * Gets the ISO 8601 representation of the time when the plugin finished its execution.
        */
        getFinishTime(): GmeCommon.ISO8601;
        /**
        * Sets the ISO 8601 representation of the time when the plugin finished its execution.
        */
        setFinishTime(time: GmeCommon.ISO8601): void;
        /**
        * Gets error if any error occured during execution.
        * FIXME: should this return an Error object?
        */
        getError(): GmeCommon.ErrorStr;
        /**
        * Sets the error string if any error occured during execution.
        */
        setError(error: GmeCommon.ErrorStr | Error): void;
        /**
        * Serializes this object to a JSON representation.
        */
        serialize(): { success: boolean, messages: GmeCommon.Message[], pluginName: string, finishTime: string };
    }


    export enum TraversalOrder { 'BFS', 'DFS' }

    /**
     * The details of a nodes creation.
     */
    export interface NodeParameters {
        /** the parent of the node to be created. */
        parent?: Core.Node | null;
        /** the base of the node to be created. */
        base?: Core.Node | null;
        /** the relative id of the node to be created 
         * (if reserved, the function returns the node behind the relative id) */
        relid?: GmeCommon.RelId;
        /** the GUID of the node to be created */
        guid?: Core.GUID;
    }
    /**
     * information about your library project.
     */
    export interface LibraryInfo {
        /** the projectId of your library. */
        projectId: string;
        /** the branch that your library follows in the origin project. */
        branchName: string;
        /** the version of your library. */
        commitHash: string;
    }
    /**
     * used by getValidChildrenMetaNodes
     */
    export interface MetaNodeParameters {
        /** the input parameters of the query. */
        object: {
            node: Core.Node,
            children?: Core.Node[]
        };
        /** 
         * if true, the query filters out the 
         * abstract and connection-like nodes 
         * (the default value is false) 
         */
        sensitive?: boolean;
        /**
         * if true, 
         * the query tries to filter out even 
         * more nodes according to the multiplicity rules 
         * (the default value is false, 
         * the check is only meaningful if all the children were passed)
         */
        multiplicity?: boolean;
        /**
         * if given, 
         * the query filters to contain only types 
         * that are visible in the given aspect.
         */
        aspect?: string;
    }
    /**
     * used by getValidSetMetaNodes
     */
    export interface MetaSetParameters {
        /** the input parameters of the query. */
        object: {
            /** the node in question. */
            node: Core.Node;
            /** the name of the set. */
            name: GmeCommon.Name;
            /** the members of the set of the node in question. */
            members?: Core.Node[]
        };
        /** 
         * if true, the query filters out the 
         * abstract and connection-like nodes 
         * (the default value is false) 
         */
        sensitive?: boolean;
        /**
         * if true,
         * the query tries to filter out even 
         * more nodes according to the multiplicity rules 
         * (the default value is false, 
         * the check is only meaningful if all the children were passed)
         */
        multiplicity?: boolean;
    }
    export interface MetaRule {
        type: string | number | boolean;
        enum: string[];
    }

    export interface TraversalOptions {
        excludeRoot?: boolean;
        order?: TraversalOrder;
        maxParallelLoad?: number;
        stopOnError?: boolean;
    }

    /**
     * The relationship between the core namespace 
     * and the core interface is not clearly expressed.
     * 
     * https://editor.dev.webgme.org/docs/source/Core.html
     */
    export interface Core {

        /**
         * It adds a project as library to your project by copying it over. 
         * The library will be a node with the given name directly 
         * under your project's ROOT. 
         * It becomes a read-only portion of your project. 
         * You will only be able to manipulate it with library functions, 
         * but cannot edit the individual nodes inside. 
         * However you will be able to instantiate or copy 
         * the nodes into other places of your project. 
         * Every node that was part of the META in the 
         * originating project becomes part of your project's meta.
         * 
         * @param node any regular node in your project.
         * @param name the name of the library you wish to use as a namespace in your project.
         * @param libraryRootHash the hash of your library's root (must exist in the project's collection at the time of call).
         * @param libraryInfo information about your project.
         */
        addLibrary: {
            (node: Core.Node, name: GmeCommon.Name, libraryRootHash: string,
                libraryInfo: LibraryInfo, callback: GmeCommon.ResultCallback<void>): void;
            (node: Core.Node, name: GmeCommon.Name, libraryRootHash: string,
                libraryInfo: LibraryInfo): Promise<void>;
        }
        /**
         * Adds a member to the given set.
         * @param node the owner of the set.
         * @param name the name of the set.
         * @param member the new member of the set.
         * @return If the set is not allowed to be modified, 
         * the function returns an error.
         */
        addMember(node: Core.Node, name: GmeCommon.Name, member: Core.Node): undefined | Error;
        /**
         * Adds a mixin to the mixin set of the node.
         * @param node the node in question.
         * @param the path of the mixin node.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        addMixin(node: Core.Node, mixinPath: GmeCommon.Path): undefined | Error;
        /**
         * When our attempt to merge two patches ended in some conflict, 
         * then we can modify that result highlighting that in case of every conflict, 
         * which side we prefer (mine vs. theirs). 
         * If we give that object as an input to this function, 
         * it will finish the merge resolving the conflict according 
         * our settings and present a final patch.
         * @param conflict the object that represents our 
         * settings for every conflict and the so-far-merged patch.
         * @return The function results in a tree structured patch 
         * object that contains the changes that cover both 
         * parties modifications 
         * (and the conflicts are resolved according the input settings).
         */
        applyResolution(conflict: {}): {};
        /**
         * Apply changes to the current project.
         * @param root
         * @param patch
         * @return only reports errors.
         */
        applyTreeDiff: {
            (root: Core.Node, patch: any, callback: GmeCommon.ResultCallback<object>): void;
            (root: Core.Node, patch: any): Promise<object>;
        }
        /**
         * Checks if the given path can be added as a mixin to the given node.
         * @param node the node in question.
         * @param mixinPath the path of the mixin node.
         * @return Returns if the mixin could be added, or the reason why it is not.
         */
        canSetAsMixin(node: Core.Node, mixinPath: GmeCommon.Path): boolean | string;
        /**
         * Removes all META rules that were specifically defined for the node 
         * (so the function do not touches inherited rules).
         * @param node the node in question.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        clearMetaRules(node: Core.Node): undefined | Error;
        /**
         * Removes all mixins for a given node.
         * @param node the node in question.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        clearMixins(node: Core.Node): undefined | Error;
        /**
         * Copies the given node into parent.
         * @param node the node to be copied.
         * @param parent the target parent where the copy will be placed.
         * @return The function returns the copied node or an error if the copy is not allowed.
         */
        copyNode(node: Core.Node, parent: Core.Node): Core.Node | Error;
        /**
         * Copies the given nodes into parent.
         * @param nodes the nodes to be copied.
         * @param parent the target parent where the copies will be placed.
         * @return The function returns an array of the copied nodes or an error 
         * if any of the nodes are not allowed to be copied to the given parent.
         */
        copyNodes(nodes: Core.Node[], parent: Core.Node): Core.Node[] | Error;
        /**
         * Creates a node according to the given parameters.
         * @param parameters the details of the creation.
         * @return The function returns the created node or null if no node was 
         * created or an error if the creation with the given parameters are not allowed.
         */
        createNode(parameters: NodeParameters): Core.Node | Error;
        /**
         * Creates a set for the node.
         * @param node the node that will own the set.
         * @param name the name of the set.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        createSet(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes the given aspect rule of the node.
         * @param node the node whose aspect rule will be deleted.
         * @param name the name of the aspect rule.
         * @return  If the node is not allowed to be modified, the function returns an error.
         */
        delAspectMeta(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes a valid type from the given aspect of the node.
         * @param node the node in question.
         * @param name the name of the aspect rule.
         * @param targetPath the absolute path of the valid type of the aspect.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delAspectMetaTarget(node: Core.Node, name: GmeCommon.Name, targetPath: GmeCommon.Path): undefined | Error;
        /**
         * Removes the given attributes from the given node.
         * @param node the node in question.
         * @param name the name of the attribute.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delAttribute(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes an attribute definition from the META rules of the node.
         * @param name the node in question.
         * @param name the name of the attribute.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delAttributeMeta(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes the given child rule from the node.
         * @param the node in question.
         * @param childPath the absolute path of the child which rule is to be removed from the node.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delChildMeta(node: Core.Node, childPath: GmeCommon.Path): undefined | Error;
        /**
         * Removes a constraint from the node.
         * @param node the node in question.
         * @param name the name of the constraint.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delConstraint(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes a node from the containment hierarchy.
         * It also removes all contained nodes.
         * @param node the node in question.
         * @return If the operation is not allowed it returns an error.
         */
        deleteNode(node: Core.Node): undefined | Error;
        /**
         * Removes the pointer from the node.
         * @param node the node in question.
         * @param name the name of the pointer.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        deletePointer(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes a set from the node.
         * @param node the node in question.
         * @param name the name of the set.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        deleteSet(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes a member from the set. The functions doesn't remove the node itself.
         * @param node the node in question.
         * @param name the name of the set.
         * @param path the path to the member to be removed.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delMember(node: Core.Node, name: GmeCommon.Name, path: GmeCommon.Path): undefined | Error;
        /**
         * Removes an attribute which represented a property of the given set membership.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param memberPath the path to the member to be removed.
         * @param attrName the name of the attribute.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delMemberAttribute(node: Core.Node, setName: GmeCommon.Name, memberPath: GmeCommon.Path, attrName: GmeCommon.Name): undefined | Error;
        /**
         * Removes a registry entry which represented a property of the given set membership.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param memberPath the path to the member to be removed.
         * @param regName the name of the registry entry.
         * @return If the node is not allowed to be modified, the function returns an error.
         */
        delMemberRegistry(node: Core.Node, setName: GmeCommon.Name, memberPath: GmeCommon.Path, regName: GmeCommon.Name): undefined | Error;
        /**
         * Removes a mixin from the mixin set of the node.
         * @param node the node in question.
         * @param mixinPath the path of the mixin node.
         * @return If the node is not allowed to be modified, the function returns an error. 
         */
        delMixin(node: Core.Node, mixinPath: GmeCommon.Path): undefined | Error;
        /**
         * Removes the complete META rule regarding the given pointer/set of the node.
         * @param node the node in question.
         * @param name the name of the pointer/set.
         * @return If the node is not allowed to be modified, the function returns an error. 
         */
        delPointerMeta(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes a possible target type from the pointer/set of the node.
         * @param node the node in question.
         * @param name the name of the pointer/set.
         * @param targetPath the absolute path of the possible target type.
         * @return If the node is not allowed to be modified, the function returns an error. 
         */
        delPointerMetaTarget(node: Core.Node, name: GmeCommon.Name, targetPath: string): undefined | Error;
        /**
         * Removes the given registry entry from the given node.
         * @param node the node in question.
         * @param name the name of the registry entry.
         * @return If the node is not allowed to be modified, the function returns an error. 
         */
        delRegistry(node: Core.Node, name: GmeCommon.Name): undefined | Error;
        /**
         * Removes the attribute entry for the set at the node.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param attrName the name of the attribute entry.
         * @return If the node is not allowed to be modified, the function returns an error. 
         */
        delSetAttribute(node: Core.Node, setName: GmeCommon.Name, attrName: GmeCommon.Name): undefined | Error;
        /**
         * Removes the registry entry for the set at the node.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param regName the name of the registry entry.
         * @return If the node is not allowed to be modified, the function returns an error. 
         */
        delSetRegistry(node: Core.Node, setName: GmeCommon.Name, regName: GmeCommon.Name): undefined | Error;
        /**
         * Generates a differential tree among the two states 
         * of the project that contains the necessary changes 
         * that can modify the source to be identical to the target. 
         * 
         * @param sourceRoot the root node of the source state.
         * @param targetRoot the root node of the target state.
         * @return the result is in form of a json object.
         */
        generateTreeDiff: {
            (sourceRoot: Core.Node, targetRoot: Core.Node, callback: GmeCommon.ResultCallback<object>): void;
            (sourceRoot: Core.Node, targetRoot: Core.Node): Promise<object>;
        }
        /**
         * Returns all META nodes.
         * @param node any node of the containment hierarchy.
         * @return the function returns a dictionary. 
         * The keys of the dictionary are the absolute 
         * paths of the META nodes of the project. 
         * Every value of the dictionary is a module:Core~Node.
         */
        getAllMetaNodes(node: Core.Node): GmeCommon.Dictionary<Core.Node>;
        /**
         * Returns the list of valid children types of the given aspect.
         * @param node the node in question
         * @param name the name of the aspect.
         * @return the function returns a list of absolute paths 
         * of nodes that are valid children of the node and fits 
         * to the META rules defined for the aspect. 
         * Any children, visible under the given aspect of 
         * the node must be an instance of at least one node 
         * represented by the absolute paths.
         */
        getAspectMeta(node: Core.Node, name: GmeCommon.Name): GmeCommon.Path[];
        /**
        * Retrieves the value of the given attribute of the given node.
        * @param node - the node in question.
        * @param name - the name of the attribute.
        *
        * @return The function returns the value of the attribute of the node.
        * The retrieved attribute should not be modified as is - it should be copied first!
        * The value can be an object or any primitive type.
        * If the return value is undefined; the node does not have such attribute defined.
        * If the node is undefined the returned value is null.
        */
        getAttribute(node: Core.Node | null, name: GmeCommon.Name): GmeCommon.OutAttr;
        /**
         * Returns the definition object of an attribute from the META rules of the node.
         * @param node the node in question.
         * @param name the name of the attribute.
         * @return The function returns the definition object, where type is always defined.
         */
        getAttributeMeta(node: Core.Node, name: GmeCommon.Name): GmeCommon.DefObject;
        /** 
         * Get the defined attribute names for the node.
         * @param node the node in question.
         * @return The function returns an array of the names of the attributes of the node.
         */
        getAttributeNames(node: Core.Node): GmeCommon.Name[];
        /** 
         * Get the base node 
         * @param node the node in question.
         * @return the base of the given node or null if there is no such node.
         */
        getBase(node: Core.Node): Core.Node | null;
        /** 
         * Get the base node at the top of the inheritance chain.
         * @param node the node in question.
         * @return the root of the inheritance chain (usually the FCO). 
         */
        getBaseRoot(node: Core.Node): Core.Node;
        /** 
         * Get the most specific meta node;
         * the closest META node of the node in question. 
         * @param node the node in question.
         * @return the first node (including itself) among the 
         * inheritance chain that is a META node. 
         * It returns null if it does not find such node 
         * (ideally the only node with this result is the ROOT).
         */
        getBaseType(node: Core.Node | null): Core.Node | null;
        /** 
         * Returns the meta-node of the node in question, that is the first base node that is part of the meta. (Aliased getBaseType).
         * @param node the node in question.
         * @return the base of the given node or null if there is no such node.
         */
        getMetaType(node: Core.Node | null): Core.Node | null;
        /** 
         * Get the most specific meta nodes;
         * Searches for the closest META node of the 
         * node in question and the direct mixins of that node. 
         * @param node the node in question.
         * @return the closest Meta node that is a base of the 
         * given node plus it returns all the mixin nodes 
         * associated with the base in a path-node dictionary.
         */
        getBaseTypes(node: Core.Node): GmeCommon.Dictionary<Core.Node> | null;
        /**
         * Retrieves the child of the input node at the given relative id.
         * It is not an asynchronous load and it automatically creates 
         * the child under the given relative id if no child was there 
         * beforehand.
         * @param node the node in question.
         * @param relativeId the relative id of the child in question.
         * @return an empty node if it was created as a result 
         * of the function or return the already existing 
         * and loaded node if it found.
         */
        getChild(node: Core.Node, relativeId: string): Core.Node;
        /**
         * Collects the data hash values of the children of the node.
         * @param node the node in question.
         * @return a dictionary of module:Core~ObjectHash that stored in 
         * pair with the relative id of the corresponding child of the node.
         */
        getChildrenHashes(node: Core.Node): GmeCommon.Dictionary<GmeCommon.MetadataHash>;
        /**
         * Return a JSON representation of the META rules 
         * regarding the valid children of the given node.
         * @param node the node in question.
         * @return a detailed JSON structure that represents the 
         * META rules regarding the possible children of the node.
         */
        getChildrenMeta(node: Core.Node): Core.RelationRule;
        /** 
         * Collects the paths of all the children of the given node.
         * @param node the node in question.
         * @return an array of the absolute paths of the children.
         */
        getChildrenPaths(parent: Core.Node): GmeCommon.Path[];
        /**
         * Collects the relative ids of all the children of the given node.
         * @param parent the container node in question.
         * @return an array of the relative ids.
         */
        getChildrenRelids(parent: Core.Node): GmeCommon.RelId[];
        /**
         * Retrieves a list of the defined pointer names that has the node as target.
         * @param node the node in question.
         * @return an array of the names of the pointers pointing to the node.
         */
        getCollectionNames(node: Core.Node): string[];
        /**
         * Retrieves a list of absolute paths of nodes that has a 
         * given pointer which points to the given node.
         * @param node the node in question.
         * @param name the name of the pointer.
         * @return an array of absolute paths of nodes having
         *  pointers pointing to the node.
         */
        getCollectionPaths(node: Core.Node, name: GmeCommon.Name): GmeCommon.Path[];
        /**
         * Gets a constraint object of the node.
         * @param node the node in question.
         * @param name the name of the constraint.
         * @return the defined constraint or null if it was not defined for the node
         */
        getConstraint(node: Core.Node, name: GmeCommon.Name): Core.Constraint | null
        /**
         * Retrieves the list of constraint names defined for the node.
         * @param node the node in question.
         * @return the array of names of constraints available for the node.
         */
        getConstraintNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Return the root of the inheritance chain of your Meta nodes.
         * @param node the node in question.
         * @return the acting FCO of your project.
         */
        getFCO(node: Core.Node): Core.Node;
        /**
         * @param node the node in question.
         * @return the fully qualified name of the node, 
         * which is the list of its namespaces separated 
         * by dot and followed by the name of the node.
         */
        getFullyQualifiedName(node: Core.Node): GmeCommon.Name;
        /**
         * @param node the node in question.
         * @return the globally unique identifier for the node.
         */
        getGuid(node: Core.Node | null): Core.GUID;
        /**
         * Returns the calculated database id of the data of the node.
         * @param node the node in question.
         * @return the so called Hash value of the data of the given node.
         *  If the string is empty, then it means that the 
         *  node was mutated but not yet saved to the database, 
         *  so it does not have a hash temporarily.
         */
        getHash(node: Core.Node): GmeCommon.MetadataHash;
        /**
         * Collects the paths of all the instances of the given node.
         * @param node the node in question.
         * @return an array of the absolute paths of the instances.
         */
        getInstancePaths(node: Core.Node): GmeCommon.Path[];
        /**
         * Gives a JSON representation of the META rules of the node.
         * @param node the node in question.
         * @return an object that represents all the META rules of the node.
         */
        getJsonMeta(node: Core.Node): GmeCommon.MetaRules;
        /**
         * Returns the origin GUID of any library node.
         * @param node the node in question.
         * @param name of the library where we want to deduct the GUID from. 
         * If not given, than the GUID is computed from the 
         * direct library root of the node
         * @return the origin GUID of the node or error if the query cannot be fulfilled.
         */
        getLibraryGuid(node: Core.Node, name: GmeCommon.Name | undefined): Core.GUID | Error;
        /**
         * Returns the info associated with the library.
         * @param node the node in question.
         * @param name of the library.
         * @return the information object, stored alongside the library 
         * (that basically carries metaData about the library).
         */
        getLibraryInfo(node: Core.Node, name: GmeCommon.Name): LibraryInfo;
        /**
         * Returns all the Meta nodes within the given library. 
         * By default it will include nodes defined in any 
         * library within the given library.
         * @param node the node in question.
         * @param name of the library.
         * @param onlyOwn if true only returns with Meta nodes defined in the library itself.
         * @return an array of core nodes that are part of your meta from the given library.
         */
        getLibraryMetaNodes(node: Core.Node, name: GmeCommon.Name, onlyOwn?: boolean): Core.Node[];
        /**
         * Gives back the list of libraries in your project.
         * @param node the node in question.
         * @param name of the library.
         * @param onlyOwn if true only returns with Meta nodes defined in the library itself.
         * @return the fully qualified names of all the 
         * libraries in your project (even embedded ones).
         */
        getLibraryNames(node: Core.Node): GmeCommon.Name[];
        /**
         * @param node the node in question.
         * @param name of the library.
         * @return the library root node or null, if the library is unknown.
         */
        getLibraryRoot(node: Core.Node, name: GmeCommon.Name): Core.Node | null;
        /**
         * @param node the node in question.
         * @param setName of the set.
         * @param memberPath the absolute path of the member node.
         * @return the value of the attribute. 
         * If it is undefined, 
         * then there is no such attributed connected to the given set membership.
         */
        getMemberAttribute(node: Core.Node, setName: GmeCommon.Name,
            memberPath: GmeCommon.Path, attrName: GmeCommon.Name): GmeCommon.OutAttr;
        /**
         * @param node the node in question.
         * @param name of the set.
         * @param memberPath the absolute path of the member node.
         * @return the array of names of attributes that 
         * represents some property of the membership.
         */
        getMemberAttributeNames(node: Core.Node, name: GmeCommon.Name, memberPath: GmeCommon.Path): string[];
        /**
         * @param node the node in question.
         * @param name of the set.
         * @param memberPath the absolute path of the member node.
         * @return the array of names of attributes that represents some property of the membership.
         */
        getMemberOwnAttributeNames(node: Core.Node, name: GmeCommon.Name, memberPath: GmeCommon.Path): string[];
        /**
         * @param node the node in question.
         * @param name of the set.
         * @param memberPath the absolute path of the member node.
         * @param regName the name of the registry entry.
         * @return the value of the registry. 
         * If it is undefined, than there is no such registry connected to the given set membership.
         */
        getMemberOwnRegistry(node: Core.Node, name: GmeCommon.Name, memberPath: string): GmeCommon.OutAttr;
        /**
         * Return the names of the registry entries defined 
         * for the set membership specifically defined to the member node.
         * @param node the node in question.
         * @param name of the set.
         * @param memberPath the absolute path of the member node.
         * @return the array of names of registry entries that represents some property of the membership.
         */
        getMemberOwnRegistryNames(node: Core.Node, name: GmeCommon.Name): string[];
        /**
         * Returns the list of absolute paths of the members of the given set of the given node.
         * @param node the node in question.
         * @param name of the set.
         * @return an array of absolute path strings of the member nodes of the set.
         */
        getMemberPaths(node: Core.Node, name: GmeCommon.Name): string[];
        /**
         * @param node the node in question.
         * @param setName of the set.
         * @param memberPath the absolute path of the member node.
         * @param regName the name of the registry entry.
         * @return the value of the registry. 
         * If it is undefined, then there is no such registry connected to the given set membership.
         */
        getMemberRegistry(node: Core.Node, setName: string, memberPath: string, regName: string): GmeCommon.OutAttr;
        /**
         * @param node the node in question.
         * @param name of the set.
         * @param memberPath the absolute path of the member node.
         * @return the array of names of registry entries that represents some property of the membership.
         */
        getMemberRegistryNames(node: Core.Node, name: GmeCommon.Name, memberpath: string): GmeCommon.Name[];
        /**
         * Checks if the mixins allocated with the node can be used. 
         * Every mixin node should be on the Meta. 
         * Every rule (attribute/pointer/set/aspect/containment/constraint) 
         * should be defined only in one mixin.
         * @param node the node in question.
         * @return the array of violations. If the array is empty, there are no violations.
         */
        getMixinErrors(node: Core.Node): Core.MixinViolation[];
        /**
         * Gathers the mixin nodes associated with the node.
         * @param node the node in question.
         * @return the dictionary of the mixin nodes keyed by their paths.
         */
        getMixinNodes(node: Core.Node): GmeCommon.Dictionary<Core.Node>;
        /**
         * Gathers the paths of the mixin nodes associated with the node.
         * @param node the node in question.
         * @return the paths of the mixins in an array.
         */
        getMixinPaths(node: Core.Node): GmeCommon.Path[];
        /**
         * Returns the resolved namespace for the node. 
         * If node is not in a library it returns the empty string. 
         * If the node is in a library of a library - 
         * the full name space is the library names joined together by dots.
         * @param node the node in question.
         * @return the name space of the node.
         */
        getNamespace(node: Core.Node): GmeCommon.Name;
        /**
         * @param node the node in question.
         * @return the value of the attribute defined specifically for the node. 
         * If undefined then it means that there is no such 
         * attribute defined directly for the node, 
         * meaning that it either inherits some value or 
         * there is no such attribute at all.
         */
        getOwnAttribute(node: Core.Node, name: GmeCommon.Name): GmeCommon.OutAttr;
        /**
         * Returns the names of the attributes of the node that have 
         * been first defined for the node and not for its bases.
         * @param node the node in question.
         * @return an array of the names of the own attributes of the node.
         */
        getOwnAttributeNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Collects the paths of all the children of the given node 
         * that has some data as well and not just inherited.
         * @param parent the node in question.
         * @return an array of the absolute paths of the children.
         */
        getOwnChildrenPaths(parent: Core.Node): GmeCommon.Path[];
        /**
         * Collects the relative ids of all the children 
         * of the given node that has some data and not just inherited. 
         * n.b. Do not mutate the returned array!
         * @param parent the node in question.
         * @return an array of the relative ids.
         */
        getOwnChildrenRelids(parent: Core.Node): GmeCommon.RelId[];
        /**
         * Retrieves the list of constraint names defined specifically for the node.
         * @param node the node in question.
         * @return the array of names of constraints for the node.
         */
        getOwnConstraintNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Returns the META rules specifically defined for the given node.
         * @param node the node in question.
         * @return an object that represent the META 
         * rules that were defined specifically for the node.
         */
        getOwnJsonMeta(node: Core.Node): GmeCommon.MetaRules;
        /**
         * Returns the list of absolute paths of the members of the 
         * given set of the given node that not simply inherited.
         * @param node the node in question.
         * @return an array of absolute path strings of the member nodes of 
         * the set that has information on the node's inheritance level.
         */
        getOwnMemberPaths(node: Core.Node, name: GmeCommon.Name): GmeCommon.Path[];
        /**
         * Gathers the mixin nodes associated with the node that were defined specifically for the given node.
         * @param node the node in question.
         * @return the dictionary of the own mixin nodes keyed by their paths.
         */
        getOwnMixinNodes(node: Core.Node): GmeCommon.Dictionary<Core.Node>;
        /**
         * Gathers the paths of the mixin nodes associated with the node 
         * that were defined specifically for the given node.
         * @param node the node in question.
         * @return the paths of the own mixins in an array.
         */
        getOwnMixinPaths(node: Core.Node): GmeCommon.Path[];
        /**
         * Returns the list of the names of the 
         * pointers that were defined specifically for the node.
         * @param node the node in question.
         * @return an array of names of pointers defined specifically for the node.
         */
        getOwnPointerNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Returns the absolute path of the target 
         * of the pointer specifically defined for the node.
         * @param node the node in question.
         * @param name the name of the pointer.
         * @return the absolute path. 
         * If the path is null, then it means that 'no-target' 
         * was defined specifically for this node for the pointer. 
         * If undefined it means that the node either inherits 
         * the target of the pointer or there is no pointer defined at all.
         */
        getOwnPointerPath(node: Core.Node, name: GmeCommon.Name): GmeCommon.OutPath;
        /**
         * Returns the value of the registry entry defined for the given node.
         * @param node the node in question.
         * @param name the name of the registry entry.
         * @return the value of the registry entry defined 
         * specifically for the node. 
         * If undefined then it means that there is no such 
         * registry entry defined directly for the node, 
         * meaning that it either inherits some value 
         * or there is no such registry entry at all.
         */
        getOwnRegistry(node: Core.Node, name: GmeCommon.Name): GmeCommon.OutAttr;
        /**
         * Returns the names of the registry enrties of the node 
         * that have been first defined for the node and not for its bases.
         * @param node the node in question.
         * @return the value of the registry entry defined 
         * specifically for the node. 
         * If undefined then it means that there is 
         * no such registry entry defined directly for the node, 
         * meaning that it either inherits some value 
         * or there is no such registry entry at all.
         */
        getOwnRegistryNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Get the value of the attribute entry 
         * specifically set for the set at the node.
         * @param node the node in question.
         * @return the value of the attribute. 
         * If it is undefined, than there is no such attribute at the set.
         */
        getOwnSetAttribute(node: Core.Node): GmeCommon.OutAttr[];
        /**
         * Return the names of the attribute 
         * entries specifically set for the set at the node.
         * @param node the node in question.
         * @return the array of names of attribute entries defined in the set at the node.
         */
        getOwnSetAttributeNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Returns the names of the sets created specifically at the node. 
         * n.b. When adding a member to a set of a node, 
         * the set is automatically created at the node.
         * @param node the node in question.
         * @return an array of set names that were specifically created at the node.
         */
        getOwnSetNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Get the value of the registry entry specifically set for the set at the node.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param regName the name of the registry entry.
         * @return the value of the registry. 
         * If it is undefined, than there is no such registry at the set.
         */
        getOwnSetRegistry(node: Core.Node, setName: GmeCommon.Name, regName: GmeCommon.Name): GmeCommon.OutAttr[];
        /**
         * Return the names of the registry entries specifically set for the set at the node.
         * @param node the node in question.
         * @param setName the name of the set.
         * @return the array of names of registry entries defined in the set at the node.
         */
        getOwnSetRegistryNames(node: Core.Node, setName: GmeCommon.Name): GmeCommon.Name[];
        /**
         * Returns the list of the META defined aspect 
         * names of the node that were specifically defined for the node.
         * @param node the node in question.
         * @return the aspect names that are specifically defined for the node.
         */
        getOwnValidAspectNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Returns the list of the META defined attribute 
         * names of the node that were specifically defined for the node.
         * @param node the node in question.
         * @return the attribute names that are defined specifically for the node.
         */
        getOwnValidAttributeNames(node: Core.Node): GmeCommon.Name[];
        /** 
         * The parent paths are available from the node. 
         * @param node the node in question.
         * @return the parent of the node or NULL if it has no parent.
         */
        getParent(node: Core.Node): Core.Node | null;
        /**  
         * Returns the complete path of the node in the containment hierarchy. 
         * @param node the node in question.
         * @return a path string where each portion is a relative id and they are separated by '/'. 
         * The path can be empty as well if the node in question is the root itself, 
         * otherwise it should be a chain of relative ids from the root of the containment hierarchy.
         */
        getPath(node: Core.Node): GmeCommon.Path;
        /**
         * Return a JSON representation of the META rules regarding the given pointer/set of the given node.
         * @param node the node in question.
         * @return a detailed JSON structure that represents the META rules regarding the given pointer/set of the node.
         */
        getPointerMeta(node: Core.Node, name: GmeCommon.Name): Core.RelationRule;
        /**
         * Retrieves a list of the defined pointer names of the node.
         * @param node the node in question.
         * @return an array of the names of the pointers of the node.
         */
        getPointerNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Retrieves the path of the target of the given pointer of the given node.
         * @param node the node in question.
         * @return the absolute path of the target node if there is a valid target. 
         * It returns null if though the pointer is defined it does not have any valid target. 
         * Finally, it return undefined if there is no pointer defined for the node under the given name.
         */
        getPointerPath(node: Core.Node, name: GmeCommon.Name): GmeCommon.OutPath;
        /** 
         * Get the assigned registry.
         * Retrieves the value of the given registry entry of the given node. 
         * @param node the node in question.
         * @return the value of the registry entry of the node. 
         * The value can be an object or any primitive type. 
         * If the value is undefined that means the node do not have such attribute defined. 
         * n.b. The retrieved registry value should not be modified as is - it should be copied first!!]
         */
        getRegistry(node: Core.Node, name: GmeCommon.Name): GmeCommon.OutAttr;
        /** 
         * Get the defined registry names.
         * Returns the names of the defined registry entries of the node.
         * @param node the node in question.
         * @return an array of the names of the registry entries of the node.
         */
        getRegistryNames(node: Core.Node): string[];
        /** 
         * Get the relative id.
         * Returns the parent-relative identifier of the node.
         * @param node the node in question.
         * @return the id string or return NULL and UNDEFINED if there is no such id for the node.
         */
        getRelid(node: Core.Node): GmeCommon.RelId | null | undefined;
        /**
         * Returns the root node of the containment tree that node is part of.
         * @param node the node in question.
         * @return the root of the containment hierarchy (it can be the node itself).
         */
        getRoot(node: Core.Node): Core.Node;
        /**
         * Get the value of the attribute entry in the set.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param attrName the name of the attribute entry.
         * @return 
         */
        getSetAttribute(node: Core.Node, setName: GmeCommon.Name, attrName: GmeCommon.Name): GmeCommon.OutAttr;
        /**
         * Return the names of the attribute entries for the set.
         * @param node the node in question.
         * @param setName the name of the set.
         * @return the array of names of attribute entries in the set.
         */
        getSetAttributeNames(node: Core.Node, setName: GmeCommon.Name): GmeCommon.Name[];
        /**
         * Returns the names of the sets of the node.
         * @param node the node in question.
         * @return an array of set names that the node has.
         */
        getSetNames(node: Core.Node): string[];
        /**
         * Get the value of the registry entry in the set.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param regName the name of the registry entry.
         * @return the value of the registry. If it is undefined, than there is no such registry at the set.
         */
        getSetRegistry(node: Core.Node, setName: GmeCommon.Name, regName: GmeCommon.Name): GmeCommon.OutAttr;
        /**
         * Return the names of the registry entries for the set.
         * @param node the node in question.
         * @param setName the name of the set.
         * @return the array of names of registry entries in the set.
         */
        getSetRegistryNames(node: Core.Node, setName: GmeCommon.Name): GmeCommon.Name[];

        /**
         * Returns the root of the inheritance chain (cannot be the node itself).
         * @param node the node in question.
         * @return the root of the inheritance chain of the node. 
         * If returns null, that means the node in question is the root of the chain.
         */
        getTypeRoot(node: Core.Node): Core.Node | null;
        /**
         * Returns the list of the META defined aspect names of the node.
         * @param node the node in question.
         * @return all the aspect names that are defined among the META rules of the node.
         */
        getValidAspectNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Returns the list of the META defined attribute names of the node.
         * @param node the node in question.
         * @return all the attribute names that are defined among the META rules of the node.
         */
        getValidAttributeNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Retrieves the valid META nodes that can be base of a child of the node.
         * @param node the node in question.
         * @return a list of valid nodes that can be instantiated as a child of the node.
         */
        getValidChildrenMetaNodes(parameters: MetaNodeParameters): Core.Node[];
        /**
         * Returns the list of absolute path of the valid children types of the node.
         * @param node the node in question.
         * @return an array of absolute paths of the nodes 
         * that was defined as valid children for the node.
         */
        getValidChildrenPaths(node: Core.Node): GmeCommon.Path[];
        /**
         * Returns the list of the META defined pointer names of the node.
         * @param node the node in question.
         * @return all the pointer names that are defined among the META rules of the node.
         */
        getValidPointerNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Retrieves the valid META nodes that can be base of a member of the set of the node.
         * @param parameters 
         * @return a list of valid nodes that can be instantiated as a member of the set of the node.
         */
        getValidSetMetaNodes(parameters: MetaSetParameters): Core.Node[];
        /**
         * Returns the list of the META defined set names of the node.
         * @param node the node in question.
         * @return all the set names that are defined among the META rules of the node.
         */
        getValidSetNames(node: Core.Node): GmeCommon.Name[];
        /**
         * Checks if the node is abstract.
         * @param node the node in question.
         * @return true if the registry entry 'isAbstract' of the node if true hence the node is abstract.
         */
        isAbstract(node: Core.Node): boolean;
        /** 
         * Check is the node is a connection-like node.
         * Connections are just nodes with two pointers named "src" and "dst". 
         * @param node the node in question.
         * @return true if both the 'src' and 'dst' pointer are defined as valid for the node.
         */
        isConnection(node: Core.Node): boolean;
        /**
         * Checks if the node in question has some actual data.
         * @param node the node in question.
         * @return true if the node is 'empty' meaning that it is not reserved by real data. 
         *  false if the node is exists and have some meaningful value.
         */
        isEmpty(node: Core.Node): boolean;
        /**
         * Checks if the member is completely overridden in the set of the node.
         * @param node the node in question.
         * @param setName the name of the set.
         * @param memberPath the absolute path to the set member.
         * @return true if the member exists in the base of the set, 
         * but was added to the given set as well, which means a complete override. 
         * If the set does not exist or the member do not have 
         * a 'base' member or just some property was overridden, the function returns false.
         */
        isFullyOverriddenMember(node: Core.Node, setName: GmeCommon.Name, memberPath: GmeCommon.Path): boolean;
        /**
         * Returns true if the node in question is a library element.
         * @param node the node in question.
         * @return true if your node is a library element, false otherwise.
         */
        isLibraryElement(node: Core.Node): boolean;
        /**
         * Returns true if the node in question is a library root.
         * @param node the node in question.
         * @return true if your node is a library root 
         * (even if it is embedded in other library), false otherwise.
         */
        isLibraryRoot(node: Core.Node): boolean;
        /**
         * Returns all membership information of the given node.
         * @param node the node in question.
         * @return a dictionary where every the key of every entry is an absolute path of a set owner node. 
         * The value of each entry is an array with the set names in which the node can be found as a member.
         */
        isMemberOf(node: Core.Node): {[ownerPath: string]: string[]};
        /**
         * Checks if the node is a META node.
         * @param node the node in question.
         * @return true if the node is a member of the 
         * METAAspectSet of the ROOT node hence can be seen as a META node.
         */
        isMetaNode(node: Core.Node): boolean;
        /**
         * Checks if the node is an instance of base.
         * @param node the node in question.
         * @param type a candidate base node.
         * @return true if the base is on the inheritance chain of node.
         * A node is considered to be an instance of itself here.
         */
        isInstanceOf(node: Core.Node, base: Core.Node): boolean;
        /**
         * Checks if the given node in any way inherits from the typeNode. In addition to checking if the node
         * "isInstanceOf" of typeNode, this methods also takes mixins into account.
         * @param node the node in question.
         * @param type a candidate base node.
         * @return true if the type is in the inheritance chain of the node or false otherwise. 
         * Every node is type of itself.
         */
        isTypeOf(node: Core.Node, type: Core.Node): boolean;
        /**
         * Checks if the given value is of the necessary type, according to the META rules.
         * @param node the node in question.
         * @param name the name of the attribute.
         * @param value the value for the attribute.
         * @return 
         */
        isValidAttributeValueOf(node: Core.Node, name: GmeCommon.Name, value: GmeCommon.InAttr): boolean;
        /**
         * Checks if according to the META rules the given node can be a child of the parent.
         * @param node the node in question.
         * @return true if according to the META rules the node can be a child of the parent. 
         * The check does not cover multiplicity 
         * (so if the parent can only have two children and it already has them, 
         * this function will still returns true).
         */
        isValidChildOf(node: Core.Node, parent: Core.Node): boolean;
        /**
         * Checks if base can be the new base of node.
         * @param node the node in question.
         * @param base the new base node.
         * @return true if the supplied base is a valid base for the node.
         */
        isValidNewBase(node: Core.Node, base: Core.Node | null | undefined): boolean;
        /**
         * Checks if parent can be the new parent of node.
         * @param node the node in question.
         * @param parent the new parent.
         * @return true if the supplied parent is a valid parent for the node.
         */
        isValidNewParent(node: Core.Node, parent: Core.Node): boolean;
        /**
         * Returns the list of the META defined pointers of the node.
         * @param node the node in question.
         * @param source the source node to test.
         * @return  true if according to the META rules, 
         * the given node is a valid target of the given pointer of the source.
         */
        isValidTargetOf(node: Core.Node, source: Core.Node, name: GmeCommon.Name): boolean;
        /**
         * From the given starting node, it loads the path 
         * given as a series of relative ids (separated by '/') and returns the node it finds at the ends of the path. 
         * If there is no node, the function will return null.
         * @param startNode the starting node of our search.
         * @param relativePath the relative path - built by relative ids - of the node in question.
         */
        loadByPath: {
            (startNode: Core.Node, relativePath: GmeCommon.Path, callback: GmeCommon.ResultCallback<Core.Node | null>): void;
            (startNode: Core.Node, relativePath: GmeCommon.Path): Promise<Core.Node | null>;
        };
        /**
         * Loads the child of the given parent pointed by the relative id. 
         * Behind the scenes, it means that it actually loads the 
         * data pointed by a hash stored inside the parent under 
         * the given id and wraps it in a node object which will 
         * be connected to the parent as a child in the containment hierarchy. 
         * If there is no such relative id reserved, the call will return with null.
         * @param parent the container node in question.
         * @param relativeId the relative id of the child in question.
         */
        loadChild: {
            (parent: Core.Node, relativeId: string, callback: GmeCommon.ResultCallback<Core.Node | null>): void;
            (parent: Core.Node, relativeId: string): Promise<Core.Node | null>;
        };
        /**
         * Loads all the children of the given parent. 
         * As it first checks the already reserved relative ids of the parent, 
         * it only loads the already existing children (so no on-demand empty node creation).
         * @param parent the container node in question.
         * @see https://github.com/webgme/webgme/wiki/GME-Core-API#containment-methods
         */
        loadChildren: {
            (parent: Core.Node, callback: GmeCommon.ResultCallback<Core.Node[]>): void;
            (parent: Core.Node): Promise<Core.Node[]>;
        }
        /**
         * Loads all the source nodes that has such a pointer and its target is the given node.
         * @param target the container node in question.
         * @param pointerName 
         * @return the relative id of the child in question.
         */
        loadCollection: {
            (target: Core.Node, pointerName: GmeCommon.Name, callback: GmeCommon.ResultCallback<Core.Node[]>): void;
            (target: Core.Node, pointerName: GmeCommon.Name): Promise<Core.Node[]>;
        }
        /**
         * Loads all the instances of the given node.
         * @param node the node in question.
         */
        loadInstances: {
            (node: Core.Node, callback: GmeCommon.ErrorOnlyCallback): void;
            (node: Core.Node): Promise<void>;
        }
        /**
         * Loads all the children of the given parent that has some data and not just inherited. 
         * As it first checks the already reserved relative ids of the parent, 
         * it only loads the already existing children (so no on-demand empty node creation).
         * @param parent the container node in question.
         */
        loadOwnChildren: {
            (parent: Core.Node, callback: GmeCommon.ErrorOnlyCallback): void;
            (parent: Core.Node): Promise<void>;
        }
        /**
         * Loads a complete sub-tree of the containment hierarchy starting from the given node, 
         * but load only those children that has some additional data and not purely inherited.
         * @param node the node in question.
         */
        loadOwnSubTree: {
            (node: Core.Node, callback: GmeCommon.ErrorOnlyCallback): void;
            (node: Core.Node): Promise<void>;
        }
        /**
         * Loads the target of the given pointer of the given node. 
         * In the callback the node can have three values: 
         * if the node is valid, then it is the defined target of a valid pointer, 
         * if the returned value is null, then it means that the pointer is defined, but has no real target, 
         * finally if the returned value is undefined then there is no such pointer defined for the given node.
         * @param source the source node in question.
         * @param pointerName the relative id of the child in question.
         */
        loadPointer: {
            (source: Core.Node, pointerName: string, callback: GmeCommon.ResultCallback<Core.Node>): void;
            (source: Core.Node, pointerName: string): Promise<Core.Node>;
        }
        /**
         * Loads the data object with the given hash and makes it a root of a containment hierarchy.
         * @param node the node in question.
         * @return 
         */
        loadRoot: {
            (metadataHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<Core.Node>): void;
            (metadataHash: GmeCommon.MetadataHash): Promise<Core.Node>;
        }
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        loadSubTree: {
            (node: Core.Node, callback: GmeCommon.ResultCallback<Core.Node>): void;
            (node: Core.Node): Promise<Core.Node>;
        }
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        loadTree: {
            (rootHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<Core.Node[]>): void;
            (rootHash: GmeCommon.MetadataHash): Promise<Core.Node[]>;
        }
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        moveNode(node: Core.Node, parent: Core.Node): Core.Node | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        persist(node: Core.Node): Core.GmePersisted;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        removeLibrary(node: Core.Node, name: GmeCommon.Name): void;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        renameLibrary(node: Core.Node, oldName: string, newName: string): void;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setAspectMetaTarget(node: Core.Node, name: GmeCommon.Name, target: Core.Node): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setAttribute(node: Core.Node, name: GmeCommon.Name, value: GmeCommon.InAttr): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setAttributeMeta(node: Core.Node, name: GmeCommon.Name, rule: MetaRule): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setBase(node: Core.Node, base: Core.Node): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setChildMeta(node: Core.Node, child: Core.Node, min?: number, max?: number): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setChildrenMetaLimits(node: Core.Node, min?: number, max?: number): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setConstraint(node: Core.Node, name: GmeCommon.Name, constraint: Core.Constraint): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setGuid: {
            (node: Core.Node, guid: Core.GUID, callback: GmeCommon.ResultCallback<void>): undefined | Error;
            (node: Core.Node, guid: Core.GUID): Promise<void>;
        }
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setMemberAttribute: {
            (node: Core.Node, setName: string, memberPath: string,
                SVGPathSegLinetoHorizontalAbsme: string,
                value?: GmeCommon.InAttr): undefined | Error;
        }
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setMemberRegistry(node: Core.Node, setName: string, memberPath: string, regName: string,
            value?: GmeCommon.InAttr): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setPointer(node: Core.Node, name: GmeCommon.Name, target: Core.Node | null): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setPointerMetaLimits(node: Core.Node, memberPath: string,
            min?: number, max?: number): undefined | Error;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        setPointerMetaTarget(node: Core.Node, name: GmeCommon.Name, target: Core.Node, min?: number, max?: number): undefined | Error;
        /** 
         * TODO
         * Get the assigned registry 
         * @param node the node in question.
         * @return 
         */
        setRegistry(node: Core.Node, name: GmeCommon.Name, value: GmeCommon.InAttr): undefined | Error;
        /**
         * TODO
         * the visitation function will be called for
         * every node in the sub-tree, the second parameter of the function
         * is a callback that should be called to
         * note to the traversal function that the visitation for a given node is finished.
         *  @param node the node in question.
        * @return 
         */
        traverse: {
            // takes a callback & returning *no* promise
            (node: Core.Node,
                options: TraversalOptions,
                visitFn: (node: Core.Node, finished: GmeCommon.VoidFn) => void,
                callback: GmeCommon.ResultCallback<void>)
                : void;
            // takes *no* callback & returns a promise
            (node: Core.Node,
                options: TraversalOptions,
                visitFn: (node: Core.Node, finished: GmeCommon.VoidFn) => void)
                : Promise<void>;
        }
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        tryToConcatChanges(mine: object, theirs: object): object;
        /**
         * TODO
         * @param node the node in question.
         * @return 
         */
        updateLibrary: {
            (node: Core.Node, name: GmeCommon.Name, libraryRootHash: GmeCommon.MetadataHash,
                libraryInfo: LibraryInfo, callback: GmeCommon.ResultCallback<void>): void;
            (node: Core.Node, name: GmeCommon.Name, libraryRootHash: GmeCommon.MetadataHash,
                libraryInfo: LibraryInfo): Promise<void>;
        }
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} oldName
         * @param {GmeCommon.Name} newName
         * @return {Error}
         */
        renamePointer(node: Core.Node, oldName: GmeCommon.Name, newName: GmeCommon.Name): undefined | Error;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} oldName
         * @param {GmeCommon.Name} newName
         * @return {Error}
         */
        renameAttribute(node: Core.Node, oldName: GmeCommon.Name, newName: GmeCommon.Name): undefined | Error;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} oldName
         * @param {GmeCommon.Name} newName
         * @return {Error}
         */
        renameRegistry(node: Core.Node, oldName: GmeCommon.Name, newName: GmeCommon.Name): undefined | Error;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} oldName
         * @param {GmeCommon.Name} newName
         * @return {Error}
         */
        renameSet(node: Core.Node, oldName: GmeCommon.Name, newName: GmeCommon.Name): undefined | Error;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @return {Core.Node}
         */
        getAttributeDefinitionOwner(node: Core.Node, name: GmeCommon.Name): Core.Node;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @return {Core.Node}
         */
        getAspectDefinitionOwner(node: Core.Node, name: GmeCommon.Name): Core.Node;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {Core.Node} parent
         * @param {GmeCommon.Name} name
         * @return {boolean}
         */
        isValidAspectMemberOf(node: Core.Node, parent: Core.Node, name: GmeCommon.Name): boolean;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Path} memberPath
         * @param {GmeCommon.Name} oldSetName
         * @param {GmeCommon.Name} newSetName
         * @return {Error}
         */
        moveMember(node: Core.Node, memberPath: GmeCommon.Path,
            oldSetName: GmeCommon.Name, newSetName: GmeCommon.Name): undefined | Error;
        /**
         * TODO
         * @param {Core.Node} node
         * @return {GmeCommon.Name[]}
         */
        getOwnValidPointerNames(node: Core.Node): GmeCommon.Name[];
        /**
         * TODO
         * @param {Core.Node} node
         * @return {GmeCommon.Name[]}
         */
        getOwnValidSetNames(node: Core.Node): GmeCommon.Name[];
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @return {GmeCommon.Path[]}
         */
        getValidTargetPaths(node: Core.Node, name: GmeCommon.Name): GmeCommon.Path[];
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @return {GmeCommon.Path[]}
         */
        getOwnValidTargetPaths(node: Core.Node, name: GmeCommon.Name): GmeCommon.Path[];
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @return {GmeCommon.Path[]}
         */
        getValidAspectTargetPaths(node: Core.Node, name: GmeCommon.Name): GmeCommon.Path[];
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @return {GmeCommon.Path[]}
         */
        getOwnValidAspectTargetPaths(node: Core.Node, name: GmeCommon.Name): GmeCommon.Path[];
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @param {Core.Node} target
         * @return {GmeCommon.MetaInfo}
         */
        getPointerDefinitionInfo(node: Core.Node, name: GmeCommon.Name, target: Core.Node): GmeCommon.MetaInfo;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @param {Core.Node} target
         * @return {GmeCommon.MetaInfo}
         */
        getAspectDefinitionInfo(node: Core.Node, name: GmeCommon.Name, target: Core.Node): GmeCommon.MetaInfo;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} name
         * @param {Core.Node} target
         * @return {GmeCommon.MetaInfo}
         */
        getSetDefinitionInfo(node: Core.Node, name: GmeCommon.Name, target: Core.Node): GmeCommon.MetaInfo;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {Core.Node} target
         * @return {GmeCommon.MetaInfo}
         */
        getChildDefinitionInfo(node: Core.Node, target: Core.Node): GmeCommon.MetaInfo;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {GmeCommon.Name} oldName
         * @param {GmeCommon.Name} newName
         * @return {Error}
         */
        renameAttributeMeta(node: Core.Node, oldName: GmeCommon.Name, newName: GmeCommon.Name): undefined | Error;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {Core.Node} target
         * @param {GmeCommon.Name} oldName
         * @param {GmeCommon.Name} newName
         * @return {Error}
         */
        moveAspectMetaTarget(node: Core.Node, target: Core.Node,
            oldName: GmeCommon.Name, newName: GmeCommon.Name): undefined | Error;
        /**
         * TODO
         * @param {Core.Node} node
         * @param {Core.Node} target
         * @param {GmeCommon.Name} oldName
         * @param {GmeCommon.Name} newName
         * @return {Error}
         */
        movePointerMetaTarget(node: Core.Node, target: Core.Node,
            oldName: GmeCommon.Name, newName: GmeCommon.Name): undefined | Error;
    }




    export interface ProjectInterface {
        /**
            *
            * @param {string} projectId - Id of project to be opened.
            * @param {object} storageObjectsAccessor - Exposes loadObject towards the database.
            * @param {GmeLogger} mainLogger - Logger instance from instantiator.
            * @param {GmeConfig} gmeConfig
            * @alias ProjectInterface
            * @constructor
            */
        constructor(projectId: string, storageObjectsAccessor: any, mainLogger: Global.GmeLogger, gmeConfig: GmeConfig.GmeConfig): void;
        /**
         * Unique ID of project, built up by the ownerId and projectName.
         * @example
         * 'guest+TestProject', 'organization+TestProject2'
         */
        projectId: string;
        projectName: GmeCommon.Name;
        CONSTANTS: GmeCommon.Dictionary<string>;
        ID_NAME: string;
        logger: Global.GmeLogger;
        // projectCache: ProjectCache;

        // Functions forwarded to project cache.
        /**
             * Inserts the given object to project-cache.
             *
             * @param {module:Storage~CommitObject|module:Core~ObjectData} obj - Object to be inserted in database.
             * @param {Object.<module:Core~ObjectHash, module:Core~ObjectData>} [stackedObjects] - When used by the core, inserts between persists are stored here.
             * @func
             * @private
        */
        insertObject(obj: GmeStorage.CommitObject, stackedObjects: GmeCommon.Dictionary<Core.DataObject>): void;
        /**
         * Try to create the full object from the patch 
         * object by looking for the base object in the cache.
         * If the base has been found it applies the patch and inserts the result. 
         * If any step fails it simply ignores the insert.
         *
         * @param {module:Storage~CommitObject|module:Core~ObjectData} obj - Object to be inserted in database.
         * @func
         * @private
         */
        insertPatchObject(obj: GmeStorage.CommitObject | Core.DataObject): void;

        /**
         * Loads the object with hash key from the database or
         * directly from the cache if recently loaded.
         *
         * @param {string} key - Hash of object to load.
         * @param {ProjectInterface~loadObjectCallback} callback - Invoked when object is loaded.
         * @func
         */
        loadObject(key: string, callback: GmeCommon.ResultCallback<GmeCommon.LoadObject>): void;
        /**
         * Collects the objects from the server and pre-loads them into the cache
         * making the load of multiple objects faster.
         *
         * @param {string} rootKey - Hash of the object at the entry point of the paths.
         * @param {string[]} paths - List of paths that needs to be pre-loaded.
         * @param {function} callback - Invoked when objects have been collected.
         * @func
         */
        loadPaths(rootKey: GmeCommon.MetadataHash, paths: GmeCommon.Path[], callback: GmeCommon.ResultCallback<any>): void;
        /**
         * Makes a commit to data base. Based on the root hash and commit message a new
         * {@link module:Storage.CommitObject} (with returned hash)
         * is generated and insert together with the core objects to the database on the server.
         *
         * @example
         * var persisted = core.persist(rootNode);
         *
         * project.makeCommit('master', ['#thePreviousCommitHash'], persisted.rootHash, persisted.objects, 'new commit')
         *   .then(function (result) {
         *     // result = {
         *     //   status: 'SYNCED',
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })
         *   .catch(function (error) {
         *     // error.message = 'Not authorized to read project: guest+project'
         *   });
         * @example
         * project.makeCommit('master', ['#notPreviousCommitHash'], persisted.rootHash, persisted.objects, 'new commit')
         *   .then(function (result) {
         *     // result = {
         *     //   status: 'FORKED',
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })...
         * @example
         * project.makeCommit(null, ['#anExistingCommitHash'], persisted.rootHash, persisted.objects, 'new commit')
         *   .then(function (result) {
         *     // result = {
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })...
         * @example
         * project.makeCommit('master', ['#aPreviousCommitHash'], previousRootHash, {}, 'just adding a commit to master')
         *   .then(function (result) {
         *     // result = {
         *     //   status: 'SYNCED',
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })...
         * @param {string} branchName - Name of branch to update (none if null).
         * @param {module:Storage~CommitHash[]} parents - Parent commit hashes.
         * @param {module:Core~ObjectHash} rootHash - Hash of root object.
         * @param {module:Core~DataObject} coreObjects - Core objects associated with the commit.
         * @param {string} msg='n/a' - Commit message.
         * @param {function} [callback] - If provided no promise will be returned.
         * @async
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link module:Storage~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        makeCommit: {
            (branchName: GmeCommon.Name, parents: GmeStorage.CommitHash,
                rootHash: Core.ObjectHash, coreObjects: object,
                msg: string, callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: GmeCommon.Name, parents: GmeStorage.CommitHash,
                rootHash: Core.ObjectHash, coreObjects: object,
                msg: string): Promise<GmeStorage.CommitResult>;
        };
        /**
         * Updates the head of the branch.
         * @param {string} branchName - Name of branch to update.
         * @param {module:Storage~CommitHash} newHash - New commit hash for branch head.
         * @param {module:Storage~CommitHash} oldHash - Current state of the branch head inside the database.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link module:Storage~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        setBranchHash: {
            (branchName: GmeCommon.Name, newHash: GmeStorage.CommitHash, oldHash: GmeStorage.CommitHash,
                callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: GmeCommon.Name, newHash: GmeStorage.CommitHash, oldHash: GmeStorage.CommitHash):
                Promise<GmeStorage.CommitResult>;
        };
        /**
         * Retrieves the commit hash for the head of the branch.
         * @param {string} branchName - Name of branch.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {module:Storage~CommitHash} <b>branchHash</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        getBranchHash: {
            (branchName: GmeCommon.Name, callback: GmeCommon.ResultCallback<GmeStorage.CommitHash>): void;
            (branchName: GmeCommon.Name): Promise<GmeStorage.CommitHash>;
        };
        /**
         * Creates a new branch with head pointing to the provided commit hash.
         * @param {string} branchName - Name of branch to create.
         * @param {module:Storage~CommitHash} newHash - New commit hash for branch head.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link module:Storage~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        createBranch: {
            (branchName: GmeCommon.Name, newHash: GmeStorage.CommitHash,
                callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: GmeCommon.Name, newHash: GmeStorage.CommitHash): Promise<GmeStorage.CommitResult>;
        };
        /**
         * Deletes the branch.
         * @param {string} branchName - Name of branch to create.
         * @param {module:Storage~CommitHash} oldHash - Previous commit hash for branch head.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link module:Storage~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        deleteBranch: {
            (branchName: GmeCommon.Name, oldHash: GmeStorage.CommitHash,
                callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: GmeCommon.Name, oldHash: GmeStorage.CommitHash): Promise<GmeStorage.CommitResult>;
        };
        /**
         * Retrieves all branches and their current heads within the project.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * Object.<string, {@link module:Storage~CommitHash}> <b>result</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        getBranches: {
            (callback: GmeCommon.ResultCallback<GmeStorage.CommitHash>): void;
            (): Promise<GmeStorage.CommitHash>;
        }
        /**
         * Retrieves an array of commits starting from a branch(es) and/or commitHash(es).
         * <br> The result is ordered by the rules (applied in order)
         * <br> 1. Descendants are always returned before their ancestors.
         * <br> 2. By their timestamp.
         * @param {string|module:Storage~CommitHash|Array} start - Branch name, commit hash or array of these.
         * @param {number} number - Number of commits to load.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * Array.<{@link module:Storage~CommitObject}> <b>result</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        getHistory: {
            (start: string | GmeStorage.CommitHash | string[], number: number,
                callback: GmeCommon.ResultCallback<Array<GmeStorage.CommitObject>>): void;
            (start: string | GmeStorage.CommitHash | string[], number: number):
                Promise<Array<GmeStorage.CommitObject>>;
        }
        /**
         * Retrieves and array of the latest (sorted by timestamp) commits for the project.
         * If timestamp is given it will get <b>number</b> of commits strictly <b>before</b>.
         * If commit hash is specified that commit will be included too.
         * <br> N.B. due to slight time differences on different machines, 
         * ancestors may be returned before
         * their descendants. 
         * Unless looking for 'headless' commits 'getHistory' is the preferred method.
         * @param {number|module:Storage~CommitHash} before - Timestamp or commitHash to load history from.
         * @param {number} number - Number of commits to load.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * Array.<{@link module:Storage~CommitObject}> <b>result</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        getCommits: {
            (before: number | GmeStorage.CommitHash, number: number, callback: GmeCommon.ResultCallback<GmeStorage.CommitObject[]>): void;
            (before: number | GmeStorage.CommitHash, number: number): Promise<GmeStorage.CommitObject[]>;
        };
        /**
         * Creates a new tag pointing to the provided commit hash.
         * @param {string} tagName - Name of tag to create.
         * @param {module:Storage~CommitHash} commitHash - Commit hash tag will point to.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with nothing.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        createTag: {
            (tagName: GmeCommon.Name, commitHash: GmeStorage.CommitHash, callback: GmeCommon.ResultCallback<void>): void;
            (tagName: GmeCommon.Name, commitHash: GmeStorage.CommitHash): Promise<void>;
        };
        /**
         * Deletes the given tag.
         * @param {string} tagName - Name of tag to delete.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with nothing.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        deleteTag: {
            (tagName: GmeCommon.Name, callback: GmeCommon.ResultCallback<void>): void;
            (tagName: GmeCommon.Name): Promise<void>;
        };
        /**
         * Retrieves all tags and their commits hashes within the project.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * Object.<string, {@link module:Storage~CommitHash}> <b>result</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        getTags: {
            (callback: GmeCommon.ResultCallback<void>): void;
            (): Promise<void>;
        };
        /**
         * Retrieves the common ancestor of two commits. If no ancestor exists it will result in an error.
         *
         * @param {module:Storage~CommitHash} commitA - Commit hash.
         * @param {module:Storage~CommitHash} commitB - Commit hash.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link module:Storage~CommitHash} <b>commonCommitHash</b>.<br>
         * On error the promise will be rejected with {@link Error} <b>error</b>.
         */
        getCommonAncestorCommit: {
            (commitA: GmeStorage.CommitHash, commitB: GmeStorage.CommitHash, callback: GmeCommon.ResultCallback<GmeStorage.CommitHash>): void;
            (commitA: GmeStorage.CommitHash, commitB: GmeStorage.CommitHash): Promise<GmeStorage.CommitHash>;
        };
    }



    export class Project {
        /**
         * Unique ID of project, built up by the ownerId and projectName.
         */
        projectId: string;

        /**
         * Creates a new branch with head pointing to the provided commit hash.
         */
        createBranch: {
            /** Name of branch to create. */
            (branchName: string, newHash: GmeStorage.CommitHash, callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: string, newHash: GmeStorage.CommitHash,): Promise<GmeStorage.CommitResult>;
        }
        /**
         * Creates a new tag pointing to the provided commit hash.
         */
        createTag: {
            (tagName: string, commitHash: GmeStorage.CommitHash, callback: GmeStorage.ErrorOnlyCallback): void;
            (tagName: string, commitHash: GmeStorage.CommitHash): Promise<GmeStorage.ErrorOnlyCallback>;
        }
        /**
        * Deletes the given branch.
        */
        deleteBranch: {
            /** Name of branch to delete. */
            (branchName: string, oldHash: GmeStorage.CommitHash, callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: string, oldHash: GmeStorage.CommitHash,): Promise<GmeStorage.CommitResult>;
        }
        /**
         * Deletes the given tag.
         */
        deleteTag: {
            /** Name of tag to delete. */
            (tagName: string, callback: GmeStorage.ErrorOnlyCallback): void;
            (tagname: string): Promise<void>;
        }
        /**
         * Retrieves all branches and their current heads within the project.
         */
        getBranches: {
            /** On success the callback will run with Object.module:Storage~CommitHash result. */
            (callback: GmeCommon.ResultCallback<GmeCommon.Dictionary<GmeStorage.CommitHash>>): void;
            /** On success the promise will be resolved with Object.module:Storage~CommitHash> result. */
            (): Promise<GmeCommon.Dictionary<GmeStorage.CommitHash>>;
        }
        /**
         * Retrieves the commit hash for the head of the branch.
         */
        getBranchHash: {
            (branchName: string, callback: GmeStorage.CommitHashCallback): void;
            (branchName: string): Promise<GmeStorage.CommitHash>;
        }
        /**
         * Retrieves and array of the latest 
         * (sorted by timestamp) commits for the project. 
         * If timestamp is given it will get number 
         * of commits strictly before before. 
         * If commit hash is specified that 
         * commit will be included too. 
         * n.b. due to slight time differences on different machines, 
         * ancestors may be returned before their descendants. 
         * Unless looking for 'headless' commits 
         * 'getHistory' is the preferred method.
         */
        getCommits: {
            (before: number | GmeStorage.CommitHash, number: number, callback: GmeCommon.ResultCallback<GmeStorage.CommitObject>): void;
            (before: number | GmeStorage.CommitHash, number: number): Promise<GmeStorage.CommitObject>;
        }
        /**
         * Retrieves the Class ancestor of two commits. 
         * If no ancestor exists it will result in an error.
         */
        getClassAncestorCommit: {
            (commitA: GmeStorage.CommitHash, commitB: GmeStorage.CommitHash, callback: GmeStorage.CommitHashCallback): void;
            (commitA: GmeStorage.CommitHash, commitB: GmeStorage.CommitHash): Promise<GmeStorage.CommitHash>;
        }
        /**
         * Retrieves an array of commits starting from a branch(es) and/or commitHash(es). 
         * The result is ordered by the rules (applied in order) 
         *  1. Descendants are always returned before their ancestors.
         *  2. By their timestamp.
         */
        getHistory: {
            (start: GmeCommon.ProjectStart, number: number, callback: GmeCommon.ResultCallback<Array<GmeStorage.CommitObject>>): void;
            (start: GmeCommon.ProjectStart, number: number): Promise<Array<GmeStorage.CommitObject>>;
        }
        /**
         * Retrieves all tags and their commits hashes within the project.
         */
        getTags: {
            (callback: GmeStorage.CommitHashCallback): void;
            (): Promise<GmeStorage.CommitHash>;
        }

        loadObject: {
            /** Hash of object to load. */
            (key: string, callback: GmeCommon.ResultCallback<GmeStorage.CommitObject>): void;
            (key: string): Promise<GmeStorage.CommitObject>;
        }
        /** 
         * Collects the objects from the server and pre-loads 
         * them into the cache making the load of multiple objects faster.
         * 
         * @param rootKey Hash of the object at the entry point of the paths.
         * @param paths List of paths that needs to be pre-loaded.
         */
        loadPaths: {
            (rootKey: string, paths: string[], callback: GmeStorage.ErrorOnlyCallback): void;
            (rootKey: string, paths: string[]): Promise<GmeStorage.ErrorOnlyCallback>;
        }

        /**
         * Makes a commit to data base. 
         * Based on the root hash and commit message a 
         * new module:Storage.CommitObject (with returned hash) 
         * is generated and insert together with the 
         * core objects to the database on the server.
         */
        makeCommit: {
            (branchName: string, parents: GmeStorage.CommitHash[],
                rootHash: Core.ObjectHash, coreObjects: Core.GmePersisted,
                msg: string, callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: string, parents: GmeStorage.CommitHash[],
                rootHash: Core.ObjectHash, coreObjects: Core.GmePersisted,
                msg: string): Promise<GmeStorage.CommitResult>;
        }
        /**
         * Updates the head of the branch.
         */
        setBranchHash: {
            (branchName: string, newHash: GmeStorage.CommitHash,
                oldHash: GmeStorage.CommitHash,
                callback: GmeCommon.ResultCallback<GmeStorage.CommitResult>): void;
            (branchName: string, newHash: GmeStorage.CommitHash,
                oldHash: GmeStorage.CommitHash): Promise<GmeStorage.CommitResult>;
        }
    }
}


declare namespace GmePlugin {
    /**
    The base plugin object from which all plugins should inherit.
    */
    class PluginBase {
        constructor();

        activeNode: Core.Node;
        activeSelection: Core.Node[];
        blobClient: Blobs.BlobClient;
        core: GmeClasses.Core;
        gmeConfig: GmeConfig.GmeConfig;
        isConfigured: boolean;
        logger: Global.GmeLogger;

        commitHash: string;
        branchName: string;
        /**
         * The resolved META nodes based on the active namespace. Index by the fully qualified meta node names
         * with the namespace stripped off at the start.
         *
         * For example, if a project has a library A with a library B. If the project and the libraries all have
         * two meta nodes named a and b. Depending on the namespace the META will have the following keys:
         *
         * 1) namespace = '' -> ['a', 'b', 'A.a', 'A.b', 'A.B.a', 'A.B.b']
         * 2) namespace = 'A' -> ['a', 'b', 'B.a', 'B.b']
         * 3) namespace = 'A.B' -> ['a', 'b']
         *
         * (n.b. 'a' and 'b' in example 3) are pointing to the meta nodes defined in A.B.)
         */
        META: any;
        /**
         * The namespace the META nodes are coming from (set by invoker).
         * The default is the full meta, i.e. the empty string namespace.
         * For example, if a project has a library A with a library B. The possible namespaces are:
         * '', 'A' and 'A.B'.
         */

        namespace: string;
        notificationHandlers: any[];
        pluginMetadata: GmeCommon.Metadata;
        project: GmeClasses.Project;
        result: GmeClasses.Result;
        rootNode: Core.Node;

        addCommitToResult(status: string): void;
        baseIsMeta(node: any): boolean;

        configure(config: GmeConfig.GmeConfig): void;
        createMessage(node: any, message: string, serverity: string): void;
        /**
         * Gets the configuration structure for the plugin.
         * The ConfigurationStructure defines the configuration for the plugin
         * and will be used to populate the GUI when invoking the plugin from webGME.
         */
        getConfigStructure(): GmeConfig.ConfigItem[];
        getCurrentConfig(): GmeConfig.GmeConfig;
        getDefaultConfig(): GmeConfig.GmeConfig;
        /**
         * Gets the description of the plugin.
         */
        getDescription(): string;
        getMetadata(): any;
        getMetaType(node: any): any;
        /**
         * Gets the name of the plugin.
         */
        getName(): string;
        /**
         * Gets the semantic version (semver.org) of the plugin.
         */
        getVersion(): string;
        initialize(logger: Global.GmeLogger, blobClient: Blobs.BlobClient, gmeConfig: GmeConfig.GmeConfig): void;
        isInvalidActiveNode(pluginId: any): any;
        isMetaTypeOf(node: any, metaNode: any): boolean;
        /**
          Main function for the plugin to execute.
          Notes:
          - Always log with the provided logger.[error,warning,info,debug].
          - Do NOT put any user interaction logic UI, etc. inside this method.
          - handler always has to be called even if error happened.
     
          When this runs the core api is used to extract the essential
          meta-model and the model-instance, these are then written to the mega-model.
          The mega-model contains all of the models used to describe the target system.
     
          https://github.com/ptaoussanis/sente
          and https://github.com/cognitect/transit-format
          will be used to connect to the
          graph database (immortals) where the mega-model is stored.
     
          @param {function(string, plugin.PluginResult)} handler - the result handler
         */
        main(callback: GmeCommon.ResultCallback<GmeClasses.Result>): void;
        save(message?: string): GmeCommon.Promisable; // returns a promise?
        sendNotification: {
            (message: string, callback: GmeCommon.ResultCallback<void>): void;
            (message: string): Promise<void>;
        }
        setCurrentConfig(newConfig: GmeConfig.GmeConfig): void;
        updateMeta(generatedMeta: any): void;
        updateSuccess(value: boolean, message: TemplateStringsArray): void;
    }
}

declare namespace Global {
    interface History {
        value: boolean;
        writable: boolean;
        enumerable: boolean;
        configurable: boolean;
    }
    interface WebGmeGlobal {
        gmeConfig: GmeConfig.GmeConfig;
        getConfig(): GmeConfig.GmeConfig;

        State?: State;
        PanelManager?: GmePanel.PanelManager;
        KeyboardManager?: KeyboardManager;
        LayoutManager?: GmePanel.LayoutManager;
        Toolbar?: Toolbar.Toolbar;
        userInfo?: UserInfo;
        history?: History;
        NpmVersion?: string;
        GitHubVersion?: string;
        version?: string;
    }

    class UserInfo {
        _id: string;
    }

    interface StateOptions {
        silent: boolean;
    }
    interface StateHandler {
        (model: any, change: string): void;
    }
    class State {
        set(update: State): void;

        registerActiveBranchName(branchName: string): void;
        registerActiveCommit(activeCommitHash: GmeCommon.MetadataHash): void;
        registerActiveVisualizer(vizualizer: Visualize.Visualizer): void;
        registerActiveSelection(selection: string[]): void;
        registerSuppressVisualizerFromNode(register: boolean): void;

        registerActiveObject(nodePath: GmeCommon.Path): void;
        getActiveObject(): any;

        registerLayout(layout: GmePanel.Layout): void;

        clear(options?: StateOptions): void;
        toJSON(): any;

        on(message: string, handler: StateHandler, target: any): void;
        off(message: string, handler: StateHandler): void;
    }
    class KeyboardManager {
        setEnabled(action: boolean): void;
        setListener(listener?: any): void;
    }
    /**
    Logs debug messages
    https://editor.webgme.org/docs/source/global.html#GmeLogger
    */
    export interface GmeLogger {
        debug(fmt: string, msg?: string | undefined): void;
        info(fmt: string, msg?: string | undefined): void;
        warn(fmt: string, msg?: string | undefined): void;
        error(fmt: string, msg?: string | undefined): void;
        /**
        Creates a new logger with the same settings
        and a name that is an augmentation of this logger and the
        provided string.
        If the second argument is true
        - the provided name will be used as is.
        */
        fork(fmt: string, reuse?: boolean): GmeLogger;
    }
}

declare namespace Toolbar {
    interface ToolbarParams {

    }

    class ToolbarItem {
        show(): void;
        hide(): void;
        destroy(): void;

        enabled(value: boolean): void;
    }

    class ToolbarButton extends ToolbarItem {
        constructor();
    }
    class ToolbarSeparator extends ToolbarItem {
        constructor();
    }
    class ToolbarRadioButtonGroup extends ToolbarButton {
        constructor();
    }
    class ToolbarToggleButton extends ToolbarButton {
        constructor();
    }
    class ToolbarTextBox extends ToolbarItem {
        constructor();
    }
    class ToolbarLabel extends ToolbarItem {
        constructor();
    }
    class ToolbarCheckBox extends ToolbarItem {
        constructor();
    }
    class ToolbarDropDownButton extends ToolbarItem {
        constructor();
        addButton(params: ToolbarParams): ToolbarButton;
    }
    class ToolbarColorPicker extends ToolbarItem {
        constructor();
    }
    interface ClickFn {
        (): void;
    }
    class Toolbar {
        constructor(element: any);
        add(item: ToolbarItem): ToolbarButton;
        addButton(params: ToolbarParams): ToolbarButton;
        addSeparator(): ToolbarSeparator;
        addRadioButtonGroup(clickFn: ClickFn): ToolbarRadioButtonGroup;
        addToggleButton(params: ToolbarParams): ToolbarToggleButton;
        addTextBox(params: ToolbarParams): ToolbarTextBox;
        addLabel(): ToolbarLabel;
        addCheckBox(): ToolbarCheckBox;
        addDropDownButton(params: ToolbarParams): ToolbarDropDownButton;
        addColorPicker(params: ToolbarParams): ToolbarColorPicker;

        refresh(): void;
    }
}

declare namespace Visualize {
    class Visualizer {
    }
}

declare namespace GmePanel {

    class IActivePanel {
        setActive(isActive: boolean): void;
        onActivate(): void;
        onDeactivate(): void;
        getNodeID(): string;
    }

    class Logger {
        createLogger(name: string, options: GmeConfig.LogOptions): Logger;
        createWithGmeConfig(name: string, gmeConfig: GmeConfig.GmeConfig): Logger;
    }
    interface Options {
        LOGGER_INSTANCE_NAME: string;
    }
    interface OptionsWithHeader extends Options {
        HEADER_TITLE: string;
        FLOATING_TITLE: string;
        NO_SCROLLING: string;
    }
    class Layout {

    }
    interface Params {
        client: any;
    }
    interface Container { }
    interface LayoutCallback {
        (self: LayoutManager): void;
    }
    class LayoutManager {
        _panels: PanelBase[];
        _currentLayoutName: string;
        _currentLayout: Layout;
        _logger: Global.GmeLogger;
        constructor();
        loadLayout(layout: Layout, callback: LayoutCallback): void;
        loadPanel(params: Params, callback: LayoutCallback): void;
        addPanel(name: string, panel: PanelBase, container: Container): void;
        removePanel(name: string): void;
        setPanelReadOnly(readOnly: boolean): void;
    }
    class PanelManager {
        constructor(client: Gme.Client);
        getActivePanel(): PanelBase;
        setActivePanel(panel: PanelBase): void;
    }
    class PanelBase {
        OPTIONS: Options;
        logger: Global.GmeLogger;
        control: any;

        constructor(options: Options);
        setSize(width: number, height: number): void;
        onResize(width: number, height: number): void;

        onReadOnlyChanged(isReadOnly: boolean): void;
        setReadOnly(isReadOnly: boolean): void;
        isReadOnly(): boolean;

        afterAppend(): void;
        setContainerUpdateFn(currentLayout: Layout, sizeUpdateFn: (layout: Layout) => number): void;

        clear(): void;
        destroy(): void;
    }
    class PanelBaseWithHeader extends PanelBase {
        OPTIONS: OptionsWithHeader;

        constructor(options: OptionsWithHeader, layoutManger: LayoutManager);
        initUI(options: OptionsWithHeader): void;
        setTitle(text: string): void;

        setActive(isActive: boolean): void;
        getNodeID(): string;
    }
}

declare namespace GmeCommon {

    export interface Dictionary<T> {
        [propName: string]: T;
    }

    export type ISO8601 = string;
    export type ErrorStr = string;
    export type MetadataHash = string;
    export type ArtifactHash = string;
    export type Name = string;
    export type NodeId = string;
    export type MemberId = Path;
    export type SetId = string;
    export type Registry = any;
    export type CrosscutsInfo = Registry;

    export type Metadata = { [key: string]: any };
    export type MetaInfo = {
        owner: Core.Node,
        ownerPath: GmeCommon.Path,
        target: Core.Node,
        targetPath: GmeCommon.Path
    };
    export type Constraint = string;
    export type AttrMeta = any;
    export type Aspect = string;

    export class Pointer {
        constructor();

        to: GmeCommon.NodeId;
        from: GmeCommon.NodeId;
    }

    export type Path = string;

    export type Buffer = Int8Array;
    export type Payload = string | Buffer | Buffer[];
    export type Content = Buffer | Buffer[];
    export type ContentString = string;
    export type Primitive = string | number;
    export type OutAttr = Primitive | undefined | null;
    export type InAttr = RegObj | Primitive | null;
    export type OutPath = string | undefined | null;

    export interface RegObj {
        x: number;
        y: number;
    }

    export type RelId = string;

    export type VoidFn = () => void;
    export interface DefStringObject {
        type: "string";
        regex?: string;
        enum?: string[];
    }
    export interface DefIntegerObject {
        type: "integer";
        min?: number;
        max?: number;
        enum?: number[];
    }
    export interface DefFloatObject {
        type: "float";
        min?: number;
        max?: number;
        enum?: number[];
    }
    export interface DefBoolObject {
        type: "boolean";
    }
    export interface DefAssetObject {
        type: "asset";
    }
    export type DefObject = DefStringObject
        | DefIntegerObject | DefFloatObject
        | DefBoolObject | DefAssetObject;

    export interface MetaCardRule {
        items: GmeCommon.Path[];
        minItems: number[];
        maxItems: number[];
    }
    export interface MetaRules {
        children: MetaCardRule;
        attributes: {
            name: DefStringObject;
            level: DefIntegerObject;
        };
        pointers: {
            ptr: MetaCardRule & {
                min: 1;
                max: 1;
            };
            set: MetaCardRule & {
                min: number;
                max: number;
            };
        };
        aspects: {
            filter: GmeCommon.Path[];
        };
        constraints: GmeCommon.Dictionary<Core.Constraint>;
    }

    interface VoidCallback {
        (): void;
    }
    interface ErrorOnlyCallback {
        (err: Error | null): void;
    }
    interface ResultCallback<T> {
        (err: Error | null, result: T): void;
    }

    interface Message {
        msg: string;
    }

    type ThenCallback = GmeCommon.VoidCallback;
    type CatchCallback = GmeCommon.ErrorOnlyCallback;

    interface Promisable {
        then(callback: ThenCallback): Promisable;
        catch(callback: CatchCallback): Promisable;
    }

    type ProjectStart = string | GmeStorage.CommitHash | string[] | GmeStorage.CommitHash[];

    /**
     * Callback for loadObject.
     *
     * @callback ProjectInterface~loadObjectCallback
     * @param {Error} err - If error occurred.
     * @param {module:Storage~CommitObject|module:Core~ObjectData} object - Object loaded from database, e.g. a commit object.
     */
    type LoadObject = GmeStorage.CommitObject | Core.DataObject;
}


declare namespace GmeUtil {

    class Canon {
        stringify(thing: any): string;
        parse(thing: any): string;
    }

    export let CANON: Canon;

    export function ASSERT(condition: boolean): never;
}

declare namespace Blobs {

    export type ObjectBlob = string;

    export interface BlobMetadata {
        name: string;
        size: number;
        mime: string;
        context: any;
        contentType: string;
    }

    export type BlobMetadataDescriptor = {}

    export interface BlobClientParamters {
        logger: Global.GmeLogger;
    }
    /**
     * Client to interact with the blob-storage. 
     * https://editor.dev.webgme.org/docs/source/BlobClient.html
     */
    export class BlobClient {
        /**
         * @param paramters
         */
        constructor(parameters: BlobClientParamters);

        /**
         * Creates a new artifact 
         * and adds it to array of artifacts of the instance.
         * @param name name of artifact.
         * @return the created artifact.
         */
        createArtifact(name: GmeCommon.Name): GmeClasses.Artifact;
        /**
         * Retrieves the Artifact from the blob storage.
         * @param metadataHash hash associated with the artifact.
         * @return resolved with Artifact artifact.
         */
        getArtifact: {
            (metadataHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<GmeClasses.Artifact>): void;
            (metadataHash: GmeCommon.MetadataHash): Promise<GmeClasses.Artifact>;
        }
        getMetadataURL(metadataHash: GmeCommon.MetadataHash): string;
        getRelativeMetadataURL(metadataHash: GmeCommon.MetadataHash): string;
        getViewURL(metadataHash: GmeCommon.MetadataHash, subpath: string): string;
        getDownloadURL(metadataHash: GmeCommon.MetadataHash, subpath: string): string;
        getRelativeDownloadURL(metadataHash: GmeCommon.MetadataHash, subpath: string): string;
        getCreateURL(filename: GmeCommon.Name, isMetadata: boolean): string;
        getRelativeCreateURL(filename: GmeCommon.Name, isMetadata: boolean): string;
        getSubObject: {
            (metadataHash: GmeCommon.MetadataHash, subpath: string, callback: GmeCommon.ResultCallback<any>): void;
            (metadataHash: GmeCommon.MetadataHash, subpath: string): Promise<any>;
        }
        getObject: {
            (metadataHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<GmeCommon.Content>, subpath: string): void;
            (metadataHash: GmeCommon.MetadataHash, subpath: string): Promise<GmeCommon.Content>;
        }
        getObjectAsString: {
            (metadataHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): GmeCommon.ContentString;
            (metadataHash: GmeCommon.MetadataHash): Promise<GmeCommon.ContentString>;
        }
        getObjectAsJSON: {
            (metadataHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<JSON>): void;
            (metadataHash: GmeCommon.MetadataHash): Promise<JSON>;
        }
        getMetadata: {
            (metadataHash: GmeCommon.MetadataHash, callback: GmeCommon.ResultCallback<GmeCommon.Metadata>): void;
            (metadataHash: GmeCommon.MetadataHash): Promise<GmeCommon.Metadata>;
        }
        getHumanSize(bytes: number, si: boolean): string;
        putFile: {
            (name: GmeCommon.Name, data: GmeCommon.Payload, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (name: GmeCommon.Name, data: GmeCommon.Payload): Promise<GmeCommon.MetadataHash>;
        }
        putMetadata: {
            (metadataDescriptor: BlobMetadataDescriptor, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash>): void;
            (metadataDescriptor: BlobMetadataDescriptor): Promise<GmeCommon.MetadataHash>;
        }
        putFiles: {
            (o: { [name: string]: GmeCommon.Payload }, callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash[]>): void;
            (o: { [name: string]: GmeCommon.Payload }): Promise<GmeCommon.MetadataHash[]>;
        }
        saveAllArtifacts: {
            (callback: GmeCommon.ResultCallback<GmeCommon.MetadataHash[]>): void;
            (): Promise<GmeCommon.MetadataHash[]>;
        }
    }

}


/**
 * This class defines the public API of the WebGME-Core
 * https://editor.dev.webgme.org/docs/source/module-Core.html
 */
declare namespace Core {

    /**
     * An object that represents some additional rule regarding some node of the project.
     */
    export interface Constraint {
        /** The script which checks if the constraint is met. */
        script: string;
        /** Short description of the constraint. */
        info: string;
        /** Gives instructions on how to deal with violations of the constraint. */
        priority: number;
    }
    /**
     * Inner data of module:Core~Node that can be serialized and saved in the storage.
     */
    export type DataObject = any;

    /** the result object of a persist which contains information about the newly created data objects. */
    export interface GmePersisted {
        rootHash: Core.ObjectHash;
        objects: { [key: string]: object };
    }

    /**
     * Globally unique identifier. 
     * A formatted string containing hexadecimal characters. 
     * If some projects share some GUIDs that can only 
     * be because the node with the given 
     * identification represents the same concept.
     */
    export type GUID = string;

    /**
     * An object that has information about a mixin violation in the given node.
     */
    export interface MixinViolation {
        /** The severity of the given error. */
        severity?: "error" | "warning";
        /** What kind of violation */
        type?: "missing" | "attribute collision" | "set collision"
        | "pointer collision" | "containment collision" | "aspect collision"
        | "constraint collision" | undefined;
        /** The name of the affected rule definition (if available). */
        ruleName?: string | undefined;
        /** The name of the affected rule definition (if available). */
        targetInfo?: string | undefined;
        /** The target node of the violation (if available). */
        targetNode?: Core.Node | undefined;
        /** The list of paths of colliding nodes (if any). */
        collisionPaths?: string[];
        /** The colliding mixin nodes (if any). */
        collisionNodes?: Core.Node[];
        /** The description of the violation. */
        message?: string;
        /** Hint on how to resolve the issue. */
        hint?: string;
    }

    export interface Node {
        _internal: string;
    }

    /** 
     * Unique SHA-1 hash for the node object.
     */
    export type ObjectHash = string;

    /**
     * An object that represents a relational type rule-set (pointer/set).
     */
    export interface RelationRuleDetail {
        /** 
         * The minimum amount of target necessary for the relationship 
         * (if not present or '-1' then there is no minimum rule that applies) 
         */
        min?: number;
        /** 
         * The maximum amount of target necessary for the relationship 
         * (if not present or '-1' then there is no maximum rule that applies) 
         */
        max?: number;
    }
    /**
     * special rules regarding the given type (if the object is empty, it still represents that the type is a valid target of the relationship)
     */
    export interface RelationRuleDictionary {
        [absolutePathOfTarget: string]: RelationRuleDetail;
    }
    export type RelationRule = RelationRuleDetail & RelationRuleDictionary;
}



/**
 * Each Plugin has a configuration specified via a metadata.json file.
 * This interface prescribes that configuration file.
 * 
 */
declare namespace GmeConfig {


    export interface ConfigItem {
        // a unique name for the configuration item
        name: GmeCommon.Name;
        // a human comprehensible name
        displayName: string;
        // a detailed description fo the item
        description: string;
        // the value of the item: if valueItem is provided it must be one of those values.
        value: string;
        // the datatype of the value: 'string', 'integer', ...
        valueType: string,
        // an enumeration of the allowed values for the value field
        valueItems?: string[];
        // a regular expression limiting the values allowed.
        // e.g. '^[a-zA-Z]+$'
        regex?: RegExp;
        // a description of the regex grammar
        // e.g. 'Name can only contain English characters!'
        regexMessage?: string;
        // can the value be changed?
        readOnly?: boolean;
    }


    /**
       https://editor.webgme.org/docs/source/global.html#GmeConfig	
       https://github.com/webgme/webgme/blob/master/config/README.md
    */
    export interface LogOptions { log: { level: string } }

    export interface ClientOptions {

        /**
         * Directory from where to serve the static files for the webapp. 
         * This should only be modified if you are using a custom UI.
         *  e.g. './src/client'
         */
        appDir: string;

        /**
         * When debug is activated in the browser 
         * (type localStorage.debug = gme* in the 
         * console and refresh the page) messages below 
         * this level will not be printed.
         * e.g. debug, info, warn, error
         */
        log: { level: string }

        /**
         * Default connection router to use when opening up a new model, 
         * available options (ordered by level of complexity 
         * and sophistication) are: 'basic', 'basic2' and 'basic3'.
         */
        defaultConnectionRouter: "basic" | "basic2" | "basic3";

        /**
         * Enable [raven-js](https://docs.sentry.io/clients/javascript/)
         * to automatically send reports to the provided url. 
         * [Sentry.io](https://sentry.io/) 
         * provides free plans and comes with an 
         * easy ui that supports releases, source maps etc.
         * 
         * Url like endpoint for raven-js e.g. 'https://****@sentry.io/999999'.
         * null indicates that it is unused.
         * 
         * Options passed to the raven-client, if not specified {release: } will be passed.
         */
        errorReporting: {
            enable: boolean;
            DSN: string;
            ravenOptions: null | string;
        }
    }

    export class GmeConfig {
        constructor();
        /**  Add-on related settings. */
        addOns: {
            /**
             * If true enables add-ons.
             *    config.addOn.enable = false;
             */
            enable: boolean;
            /**
             * In milliseconds, the waiting time before add-ons 
             * (or the monitoring of such) is stopped after 
             * the last client leaves a branch.
             *    config.addOn.monitorTimeout = 5000;
             */
            monitorTimeout: number;
            /**
             * Array of paths to custom add-ons. 
             * If you have an add-on at C:/SomeAddOns/MyAddOn/MyAddOn.js 
             * the path to append would be C:/SomeAddOns or a relative path 
             * (from the current working directory). 
             * N.B. this will also expose any other add-on in that directory, 
             * e.g. C:/SomeAddOns/MyOtherAddOn/MyOtherAddOn.js.
             *    config.addOn.basePaths = ['./src/addon/core'];
             */
            basePaths: string[];
        }
        /**  Authentication related settings. */
        authentication: {
            /**
             * If true certain parts will require that users are authenticated.
             *    config.authentication.enable = false;
             */
            enable: boolean;
            /**
             * Generate a guest account for non-authenticated connections.
             *    config.authentication.allowGuests = true;
             */
            allowGuests: boolean;
            /**
             * Allow clients to create new users via the REST api.
             *    config.authentication.allowUserRegistration = true;
             */
            allowUserRegistration: boolean;
            /**
             * User account which non-authenticated connections will access the storage.
             *    config.authentication.guestAccount = 'guest';
             */
            guestAccount: string;
            /**
             * Where clients are redirected if not authenticated.
             *    config.authentication.logInUrl = '/profile/login';
             */
            logInUrl: string;
            /**
             * Where clients are redirected after logout.
             *   config.authentication.logOutUrl = '/profile/login';
             */
            logOutUrl: string;
            /**
             * Strength of the salting of the users' passwords bcrypt.
             *   config.authentication.salts = 10;
             */
            salts: number;
            authorizer: {
                /**
                 * Path (absolute) to module implementing AuthorizerBase 
                 * (located next to deafultauthorizer) for getting and 
                 * setting authorization regarding projects and project creation.
                 *   config.authentication.authorizer.path = './src/server/middleware/auth/defaultauthorizer';
                 */
                path: string;
                /**
                 * Optional options passed to authorizer module at initialization (via gmeConfig).
                 *    config.authentication.authorizer.options = {};
                 */
                options: any;
            }
            jwt: {
                /**
                 * Id of token used when placed inside of a cookie.
                 *    config.authentication.jwt.cookieId = 'access_token';
                 */
                cookieId: string;
                /**
                 * Lifetime of tokens in seconds.
                 *   config.authentication.jwt.expiresIn = 3600 * 24 * 7;
                 */
                expiresIn: number;
                /**
                 * Interval in seconds, if there is less time until 
                 * expiration the token will be automatically renewed.
                 *  (Set this to less or equal to 0 to disabled automatic renewal.)
                 *   config.authentication.jwt.renewBeforeExpires = 3600;
                 */
                renewBeforeExpires: number;
                /**
                 * Private RSA256 key used when generating tokens 
                 * (N.B. if authentication is turned on 
                 * - the defaults must be changed and the keys must 
                 * reside outside of the app's root-directory or alt. 
                 * a rule should be added to config.server.extlibExcludes).
                 *   config.authentication.jwt.privateKey = './src/server/middleware/auth/EXAMPLE_PRIVATE_KEY';
                 */
                privateKey: string;
                /**
                 * Public RSA256 key used when evaluating tokens.
                 *   config.authentication.jwt.publicKey = './src/server/middleware/auth/EXAMPLE_PRIVATE_KEY';
                 */
                publicKey: string;
                /**
                 * The algorithm used for encryption (should not be edited w/o chaning keys appropriately).
                 *   config.authentication.jwt.algorithm = 'RS256';
                 */
                algorithm: string;
                /**
                 * Replaceable module for generating tokens in case 
                 * webgme should not generated new tokens by itself.
                 *   config.authentication.jwt.tokenGenerator = './src/server/middleware/auth/localtokengenerator.js';
                 */
                tokenGenerator: string;
            }
        }
        /** Bin script related settings. */
        bin: {
            /**
             * Logger settings when running bin scripts.
             *   config.bin.log = see config
             */
            log: any;
        };
        /** Blob related settings. */
        blob: Blobs.ObjectBlob;
        /** Client related settings. */
        client: ClientOptions;
        /** Client related settings. */
        core: {
            // GmeClasses.Core;
            /**
             * If true will enable validation (which takes place on the server) 
             * of custom constraints defined in the meta nodes.
             *   config.core.enableCustomConstraints = false;
             */
            enableCustomConstraints: boolean;
        }
        /**
         * If true will add extra debug messages and also 
         * enable experimental Visualizers, (URL equivalent (only on client side) ?debug=true).
         */
        public debug: boolean;
        /** Executor related settings. */
        executor: {
            /**
             *  If true will enable the executor.
             *   config.executor.enable = false;
             */
            enable: boolean;
            /**
             * If defined this is the secret shared between the server and attached workers.
             *   config.executor.nonce = null;
             */
            nonce: null | string;
            /**
             * Time interval in milliseconds that attached 
             * workers will request jobs from the server.
             *   config.executor.workerRefreshInterval = 5000;
             */
            workerRefreshInterval: number;
            /**
             * Time in milliseconds that output is stored after a job has finished.
             *   config.executor.clearOutputTimeout = 60000;
             */
            clearOutputTimeout: number;
            /**
             * If true, all data stored for jobs 
             * (jobInfos, outputs, workerInfos, etc.) 
             * is cleared when the server starts.
             *   config.executor.clearOldDataAtStartUp = false;
             */
            clearOldDataAtStartUp: boolean;
            /**
             * Path to configuration file for label jobs for the workers.
             *   config.executor.labelJobs = './labelJobs.json';
             */
            labelJobs: string;
        }
        /** Mongo database related settings. */
        mongo: {
            /**
             * MongoDB connection uri
             * config.mongo.uri = 'mongodb://127.0.0.1:27017/multi';
             */
            uri: string;
            /**
             * Options for MongoClient.connect
             * config.mongo.options = see config
             */
            options: string;
        };
        /** Plugin related settings. */
        plugin: {
            /**
             * If true will enable execution of plugins on the server.
             *   config.plugin.allowBrowserExecution = true;
             */
            allowBrowserExecution: boolean;
            /**
             * If true will enable execution of plugins on 
             * the server.config.plugin.allowServerExecution = false;
             */
            allowServerExecution: boolean;
            /**
             * Same as for `config.addOns.basePath' 
             * [TODO: link to AddOns] but for plugins instead.
             *   config.plugin.basePaths = ['./src/plugin/coreplugins']
             */
            basePaths: string[];
            /**
             * If true there is no need to register plugins on the 
             * root-node of project - all will be available from the drop-down.
             *   config.plugin.displayAll = false;
             */
            displayAll: boolean;
            /**
             * Time, in milliseconds, results will be stored on 
             * the server after they have finished (when invoked via the REST api).
             *   config.plugin.serverResultTimeout = 60000;
             */
            serverResultTimeout: number;
        }
        /** Additional paths to for requirejs. 
         * Custom paths that will be added to the 
         * paths of requirejs configuration. 
         * Paths added here will also be served under the given key, 
         * i.e. {myPath: './aPath/aSubPath/'} 
         * will expose files via <host>/myPath/someFile.js.
         */
        requirejsPaths: GmeCommon.Dictionary<string>;
        /** REST related settings. */
        rest: {
            /**
             * Routing path (keys) from origin and file-path 
             * (values) to custom REST components.
             * Use the RestRouterGenerator plugin to generate 
             * a template router (see the generated file for more info).
             *   config.rest.components = {};
             */
            components: any;
        }
        /** Seed related settings. */
        seedProjects: {
            /**
             * Enables creation of new projects using seeds.
             *   config.seedProjects.enable = true;
             */
            enable: boolean;
            /**
             * Enables duplication of entire project with 
             * full history (requires at least mongodb 2.6).
             *   config.seedProjects.allowDuplication = true;
             */
            allowDuplication: boolean;
            /**
             * Used by the GUI when highlighting/selecting
             * the default project to seed from.
             *   config.seedProjects.defaultProject = 'EmptyProject';
             */
            defaultProject: string;
            /**
             * List of directories where project seeds are stored.
             *   config.seedProjects.basePaths = ['./seeds'];
             */
            basePaths: string[];
        }
        /** Server related settings. */
        server: {
            /**
             * Port the server is hosted from.
             *   config.server.port = 8888;
             */
            port: number;
            /**
             * Optional handle object passed to server.listen 
             * (aligning port must still be given).
             *   config.server.handle = null;
             */
            handle: null | { fd: number };
            /**
             * If greater than -1 will set the timeout property of the http-server. 
             * (This can be used to enable large, > 1Gb, file uploads.)
             *  config.server.timeout = -1;
             */
            timeout: number;
            /**
             * Maximum number of child process spawned for workers.
             *   config.server.maxWorkers = 10;
             */
            maxWorkers: number;
            /**
             * Transports and options for the server (winston) logger. 
             *   config.server.log = see config
             */
            log: any;
            /**
             * Array of regular expressions that will hinder access to files via the '/extlib/' route. 
             * Requests to files matching any of the provided pattern will result in 403.
             *   config.server.extlibExcludes = ['.\.pem$', 'config\/config\..*\.js$']
             */
            extlibExcludes: string[];
            /**
             * Indicate if the webgme server is behind a secure proxy 
             * (needed for adding correct OG Metadata in index.html).
             *   config.server.behindSecureProxy = false
             */
            behindSecureProxy: boolean;
        }
        /** Socket IO related settings. */
        socketIO: {
            /**
             * Options passed to the socketIO client when connecting to the sever.
             *   config.socketIO.clientOptions = see config
             */
            clientOptions: any;
            /**
             * Options passed to the socketIO server when attaching to the server.
             *   config.socketIO.serverOptions = see config
             */
            serverOptions: any;
        }

        /** Storage related settings. */
        storage: {
            /**
             * Number of core-objects stored before emptying cache (server side).
             *  config.storage.cache = 2000;
             */
            cache: number;
            /**
             * Number of core-objects stored before emptying cache (client side).
             *   config.storage.clientCache = 2000;
             */
            clientCache: number;
            /**
             * If true, events regarding project/branch creation/deletion 
             * are only broadcasted and not emitted back to the socket who made the change. 
             * Only modify this if you are writing a custom GUI.
             *  config.storage.broadcastProjectEvents = false;
             */
            broadcastProjectEvents: boolean;
            /**
             * If greater than -1, the maximum number of core objects 
             * that will be emitted to other clients. 
             * N.B. this only applies to newly created nodes, 
             * any modified data will always be sent as patches.
             *   config.storage.maxEmittedCoreObjects = -1;
             */
            maxEmittedCoreObjects: number;
            /**
             * Size of bucket before triggering a load of objects from the server.
             *   config.storage.loadBucketSize = 100;
             */
            loadBucketSize: number;
            /**
             * Time in milliseconds (after a new bucket has been created) 
             * before triggering a load of objects from the server.
             *   config.storage.loadBucketTimer = 10;
             */
            loadBucketTimer: number;
            /**
             * Algorithm used when hashing the objects in the database, 
             * can be 'plainSHA1', 'rand160Bits' or 'ZSSHA'.
             *   config.storage.keyType = 'plainSha';
             */
            keyType: "plainSHA1" | "rand160Bits" | "ZSSHA";
            /**
             * Since v2.6.2 patched objects on the server are being 
             * checked for consistency w.r.t. the provided hash 
             * before insertion into database. 
             * If true, no checking at all will take place.
             *   config.storage.disableHashChecks = false;
             */
            disableHashChecks: boolean;
            /**
             * If config.storage.disableHashChecks is set to 
             * false and this option is set to true, 
             * will not insert objects if the hashes do not match. 
             * Set this to false to only log the errors.
             *   config.storage.requireHashesToMatch = true;
             */
            requireHashesToMatch: boolean;
            /**
             * (N.B. Experimental feature) 
             * If enable, incoming commits to branches that initially 
             * were FORKED will be attempted to be merged with the head of the branch. 
             * Use with caution as larger (+100k nodes) projects can slow down the commit rate.
             *   config.storage.autoMerge.enable = false;
             */
            autoMerge: {
                enable: boolean;
            }

            database: {
                /**
             * Type of database to store the data (metadata e.g. _users is always stored in mongo), 
             * can be 'mongo', 'redis' or 'memory'.
             *   config.storage.database.type = 'mongo';
             */
                type: "mongo" | "redis" | "memory";
            }
            /**
             * Options passed to database client 
             * (unless mongo is specified, in that case config.mongo.options are used).
             *   config.storage.database.options = '{}';
             */
            options: string;
        }


        /** Visualization related settings. */
        visualization: {
            /**
             * Array of paths to decorators that should be available.
             * 
             * decoratorPaths = ['./src/client/decorators']
             */
            decoratorPaths: string[];
            /**
             * Array of decorators (by id) that should be downloaded from the
             *  server before the editor starts 
             * - when set to null all available decorators will be downloaded.
             */
            decoratorToPreload: number | null;
            /**
             * Array of paths (in the requirejs sense) to 
             * css files that should be loaded at start up. 
             * (To use this option a path would typically 
             * have to be added at config.requirejsPaths.)
             */
            extraCss: string[];
            /**
             * Array of paths to directories containing SVG-files 
             * that will be copied and made available as SVGs 
             * for decorators (ConstraintIcons is currently reserved).
             */
            svgDirs: string[];
            /**
             * Array of paths to json-files containing meta-data about the used visualizers.
             * 
             * visualizerDescriptors = ['../src/client/js/Visualizers.json']
             */
            visualizerDescriptors: string[];
            /**
             * Array of base paths that will be mapped from 'panels' in requirejs.
             * 
             * panelPaths = ['../src/client/js/Panels']
             */
            panelPaths: string[];
            /**
             * Specifies which layout to use 
             * (directory name must be present in any of the provided base-paths).
             * 
             */
            layout: {
                /**
                 * default = 'DefaultLayout'
                 */
                default: string;
                /**
                 * Array of base paths for the layouts.
                 *  basePaths = ['../src/client/js/Layouts']
                 * 
                 * @type {string[]}
                 */
                basePaths: string[];
            }
        }

        webhooks: {
            /**
             * If true will start a webhook-manager from the server.
             *  config.webhooks.enable = true;
             */
            enable: boolean;
            /**
             * Type of webhook-manager for detecting events, can be 'memory', 'redis'. 
             * Memory runs in the server process, 
             * whereas redis is running in a sub-process. 
             * Redis requires the socket.io adapter to be of type redis. 
             * (It is also possible to run the redis manager separately from the webgme server.)
             *   config.webhooks.manager = 'memory';
             */
            manager: "memory" | "redis";
        }
        /**
         *  Serialize the configuration.
         * @returns {*} 
         * @memberOf GmeConfig
         */
        serialize(): any;

    }

    export class PluginConfig extends GmeConfig {
        [propName: string]: any;
    }

    export let config: PluginConfig;

}

declare namespace GmeStorage {
    export interface ErrorOnlyCallback {
        (err: Error | null): void;
    }
    export interface CommitHashCallback {
        (err: Error | null, result: CommitHash): void;
    }
    export type CommitHash = string;


    export interface CommitObject {
        /**
         * Hash of the commit object, a.k.a commitHash.
         */
        _id: GmeStorage.CommitHash;
        /**
         * Hash of the associated root object, a.k.a. rootHash.
         */
        root: Core.ObjectHash;
        /**
         * Commits from where this commit evolved.
         */
        parents: GmeStorage.CommitHash[];
        /**
         * When the commit object was created (new Date()).getTime().
         */
        time: number;
        /**
         * Commit message.
         */
        message: string;
        /**
         * Who performed the update.
         */
        updater: string[];
        /**
         * A constant 'commit'.
         */
        type: string;
    }


    export interface CommitResult {
        /** The commitHash for the commit. */
        hash: CommitHash;
        status: "SYNCED" | "FORKED" | "CANCELED" | undefined;
    }
}


/**
Things in this module are deprecated.
This was a serialization supported in version 1.
*/
declare module "webgme/v1" {
    export type GUID = string;

    export interface JsonContainment {
        [index: string]: JsonContainment;
    }
    export interface JsonNode {
        attributes: any;
        base: string;
        meta: any;
        parent: string;
        pointers: any;
        registry: any;
        sets: any;
        constratints: any;
    }
    export interface JsonObj {
        root: { path: string; guid: GUID };
        containment: JsonContainment; // guid tree of hashes
        bases: any; //
        nodes: any;
        relids: GmeCommon.RelId[];
        metaSheets: any;
    }
}
