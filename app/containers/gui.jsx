var path = require('path');
const bindAll = require('lodash.bindall');
const defaultsDeep = require('lodash.defaultsdeep');
const React = require('react');
const VM = require('../../scratch-vm');
const ScratchBlocks = require('../../scratch-blocks');
const KittenBlock = require('../../ipopconblock-pc');

const VMManager = require('../lib/vm-manager');
const MediaLibrary = require('../lib/media-library');
const shapeFromPropTypes = require('../lib/shape-from-prop-types');

const Blocks = require('./blocks.jsx');
const GUIComponent = require('../components/gui.jsx');
const GreenFlag = require('./green-flag.jsx');
const SpriteSelector = require('./sprite-selector.jsx');
const Stage = require('./stage.jsx');
const StopAll = require('./stop-all.jsx');
const HeaderBar = require('./header-bar.jsx');
const EditorTabs = require('./editor-tabs.jsx');
const ArduinoPanel = require('./arduino-panel.jsx');
const SetupModal = require('./setup-modal.jsx');

const SpriteLibrary = require('./sprite-library.jsx');
const CostumeLibrary = require('./costume-library.jsx');
const BackdropLibrary = require('./backdrop-library.jsx');
const debugtool = require('nw.gui').Window.get();

import { AlertList  } from "react-bs-notifier";


class GUI extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['closeModal','toggleIpopconPanel','toggelStage','sendCommonData','portReadLine','deviceQuery','clearConsole',
                        'stopProject','restoreFirmware','openIno','updateEditorInstance','uploadProject','appendLog',
                        'openLoadProjectDialog','loadProject','selectLanguage','applyConfig','selectTarget',
                        'consoleSend','consoleClear','translateCode','saveProject','changeTitle','notify',
                        'updaterCallback','updateKittenblock','updateProgress','updateDone','resizeWindow']);
        this.vmManager = new VMManager(this.props.vm);
        this.mediaLibrary = new MediaLibrary();
        this.consoleMsgBuff=[{msg: "Hello KittenBlock", color: "green"}];
        this.editor;
        this.state = {
            currentModal: null,
            showArduinoPanel: false,
            showStage: true,
            consoleMsg: this.consoleMsgBuff,
            editorCode: '#include <Arduino.h>\n\nvoid setup(){\n}\n\nvoid loop(){\n}\n\n',
            language: this.props.kb.config.language,
            pluginlist: this.props.kb.pluginlist,
            projectName: "",
            firmwares: [{name: 'arduino', 'path': null}],
            alerts: [],
            alertTimeout: 5000,
            updater: {'version': 0, 'path': ''},
            updateProgress: 0,
            windowHeight: window.innerHeight,
        };

        debugtool.showDevTools();
    }
    clearConsole(){
        this.consoleMsgBuff = [];
        this.setState({consoleMsg:this.consoleMsgBuff})
    }
    sendCommonData(msg){
        this.props.kb.sendCmd(msg);
        if(msg instanceof Uint8Array){
            var msg = Buffer.from(msg).toString('hex')
            this.consoleMsgBuff.push({msg:msg,color:"Gray"});
            this.setState({consoleMsg:this.consoleMsgBuff})
        }else{
            this.consoleMsgBuff.push({msg:msg,color:"Gray"});
            this.setState({consoleMsg:this.consoleMsgBuff})
        }

    }
    appendLog(msg,color){
        if(!color)
            color = "Gray";
        this.consoleMsgBuff.push({msg:msg,color:color});
        this.setState({consoleMsg:this.consoleMsgBuff})
    }
    portReadLine(line){
        this.props.kb.arduino.parseLine(line);
        this.appendLog(line,'LightSkyBlue');
    }
    deviceQuery(data){
        console.log("query data "+JSON.stringify(data));
        return this.props.kb.arduino.queryData(data);
    }
    stopProject(data){
        //this.sendCommonData("M999");
    }
    applyConfig(){
        this.props.kb.saveConfig();
        this.props.kb.reloadApp();
    }
    componentDidMount () {
        // add nwdirectory tag to input file
        this.vmManager.attachKeyboardEvents();
        this.props.vm.loadProject(this.props.projectData);
        // kittenblock link hardware
        this.props.vm.runtime.ioDevices.serial.regSendMsg(this.sendCommonData);
        vm.runtime.ioDevices.serial.regQueryData(this.deviceQuery);
        this.props.kb.arduino.sendCmdEvent.addListener(this.sendCommonData);
        this.props.vm.start();
        this.props.kb.loadDefaultProj();
        this.saveProjDialog.nwsaveas = "KittenBot";
        // check if firmware exist in plugin
        if("firmware" in this.props.kb.plugin){
            var pluginName = this.props.kb.pluginmng.enabled;
            var firmpath = path.resolve(this.props.kb.pluginpath,pluginName,this.props.kb.plugin.firmware);
            var firmobj = {"name":pluginName,'path':firmpath}
            this.state.firmwares.push(firmobj);
            this.setState({firmwares:this.state.firmwares});
        }
        // check if plugin has parseLine method
        if('parseLine' in this.props.kb.plugin){
            this.props.kb.setPluginParseLine(this.props.kb.plugin.parseLine);
        }
        this.props.kb.notify = this.notify;
        // get latest version from server
        this.props.kb.updater.getServer(this.updaterCallback);
        // bind window on resize method
        window.onresize = this.resizeWindow;

    }
    componentWillReceiveProps (nextProps) {
        if (this.props.projectData !== nextProps.projectData) {
            this.props.vm.loadProject(nextProps.projectData);
        }
    }
    componentWillUnmount () {
        this.vmManager.detachKeyboardEvents();
        this.props.vm.stopAll();
    }
    openModal (modalName) {
        console.log("open modal "+modalName);
        this.setState({currentModal: modalName});
    }
    closeModal () {
        this.setState({currentModal: null});
    }
    toggleIpopconPanel(){
        //this.setState({showArduinoPanel: !this.state.showArduinoPanel});
        //console.log(this.props.kb.plugin);
        console.log("Connection button is clicked!!");



        this.props.kb.plugin.IPOP.discover(function(ipopcon_device) {
              console.log('discovered: ' + ipopcon_device);
              ipopcon_device.connectAndSetUp(function(err) {
                  if (err){
                    console.log("connection error!!")
                  }



                  ipopcon_device.readDeviceName(function (error, deviceName) {
                    console.log('\t connected device name = ' + deviceName);
                  });

                  ipopcon_device.enableAccelerometer(function (error){
                    if(error){
                      console.log("enabling accelerometer is failed!!");
                    }
                  });

                  ipopcon_device.enableMagnetometer(function (error){
                    if(error){
                      console.log("enabling Magnetometer is failed!!");
                    }
                  });

                  ipopcon_device.enableGyroscope(function (error){
                    if(error){
                      console.log("enabling Gyroscope is failed!!");
                    }
                  });

                  ipopcon_device.enableIrTemperature(function (error){
                    if(error){
                      console.log("enabling IrTemperatur is failed!!");
                    }
                  });

                  ipopcon_device.enableBarometricPressure(function (error){
                    if(error){
                      console.log("enabling BarometricPressure is failed!!");
                    }
                  });

                  ipopcon_device.enableLuxometer(function (error){
                    if(error){
                      console.log("enabling Luxometer is failed!!");
                    }
                  });

                  ipopcon_device.notifySimpleKey(function (error){
                    if(error){
                      console.log("enabling simple key is failed!!");
                    }
                  });

/*
                    ipopcon_device.on('simpleKeyChange', function(left, right, reedRelay) {

                    if(right){
                      this.IPOP._button_2  = 1;
                      console.log("button 2 : " +  this.IPOP._button_2);
                    }

                    else {
                      this.IPOP._button_2  = 0;
                      console.log("button 2 : " +   this.IPOP._button_2);
                    }

                    if(left){
                      this.IPOP._button_1  = 1;
                      console.log("button 1 : " +   this.IPOP._button_1);
                    }

                    else {
                      this.IPOP._button_1  = 0;
                      console.log("button 1 : " +   this.IPOP._button_1);
                    }

                  });
*/




              });






              this.props.kb.plugin.IPOP._device = ipopcon_device;






              ipopcon_device.on('disconnect', function() {
                  console.log('disconnected!');
                  process.exit(0);
              });

        }.bind(this));
    }

    toggelStage(){
        this.setState({showStage: !this.state.showStage})
    }
    restoreFirmware(firmware){
        var code = this.props.kb.loadFirmware(firmware.path);
        this.setState({editorCode: code});
    }
    updateEditorInstance(editor){
        this.editor = editor.editor;
    }
    openIno(){
        var code = this.editor.getValue();
        this.props.kb.openIno(code);
    }
    uploadProject() {
        var code = this.editor.getValue();
        this.props.kb.uploadProject(code,this.appendLog);
    }
    openLoadProjectDialog(){
        this.loadProjDialog.click();
    }
    openSaveProjectDialog(){
        this.saveProjDialog.click();
    }
    loadProject(){
        var file = this.loadProjDialog.value;
        var extName = path.extname(file);
        if(extName=='.sb2'){
            var name = this.props.kb.loadSb2(file);
            this.setState({projectName:name});
        }else if(extName=='.kb'){
            var kbobj = this.props.kb.loadKb(file);
            var xml = Blockly.Xml.textToDom(kbobj.xml);
            var workspace = this.refs.Blocks.workspace
            Blockly.Xml.domToWorkspace(xml, workspace);
            this.setState({projectName:kbobj.name});
        }
    }
    saveProject(){
        var file = this.saveProjDialog.value;
        var workspace = this.refs.Blocks.workspace
        var xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
        //console.log("save proj "+file+" "+xml );
        this.props.kb.saveKb(file,xml);
    }
    selectLanguage(lang){
        var langobj={"name":'',"file":''}
        switch (lang){
            case 'en':
                langobj.name='english';
                langobj.file='en.js';
                break;
            case 'es':
                langobj.name='español';
                langobj.file='es.js';
                break;
            case 'zh-hans':
                langobj.name='中文';
                langobj.file='zh-hans.js';
                break;
            case 'fr':
                langobj.name='français';
                langobj.file='fr.js';
                break;
        }
        this.setState({language:langobj});
        this.props.kb.config.language = langobj;
    }
    selectTarget(obj){
        var targetid = obj.target.id;
        this.props.vm.setEditingTarget(targetid);
    }
    consoleSend(txt){
        this.sendCommonData(txt);
    }
    consoleClear(){
        this.consoleMsgBuff=[];
        this.setState({consoleMsg:this.consoleMsgBuff})
    }
    translateCode(){
        var code = this.refs.Blocks.sb2cpp();
        this.setState({editorCode:code});
    }
    selectPlugin(plugin){
        console.log("select plugin "+plugin);
        var ret = this.props.kb.selectPlugin(plugin);
        this.setState({pluginlist:ret});
    }
    changeTitle(e){
        this.setState({projectName:e});
        this.saveProjDialog.nwsaveas = e;
    }
    onAlertDismissed(alert) {
        const alerts = this.state.alerts;
        // find the index of the alert that was dismissed
        const idx = alerts.indexOf(alert);

        if (idx >= 0) {
            this.setState({
                // remove the alert from the array
                alerts: [...alerts.slice(0, idx), ...alerts.slice(idx + 1)]
            });
        }
    }
    notify(type,msg){
        const newAlert ={
            id: (new Date()).getTime(),
            type: type,
            message: msg
        };
        this.setState({
            alerts: [...this.state.alerts, newAlert]
        });
    }
    updaterCallback(obj){
        this.setState({updater:obj});
    }
    updateProgress(percent){
        console.log(percent);
        this.setState({updateProgress:percent})
    }
    updateDone(ret){
        if(ret==0){
            this.props.kb.reloadApp();
        }
    }
    updateKittenblock(){
        console.log("do update"+this.state.updater.version);
        this.props.kb.doUpdate(this.state.updater,this.updateDone,this.updateProgress);
    }
    resizeWindow(){
        console.log("window "+window.innerHeight);
        this.setState({windowHeight:window.innerHeight});
    }
    render () {
        let {
            backdropLibraryProps,
            basePath,
            blocksProps,
            costumeLibraryProps,
            greenFlagProps,
            projectData, // eslint-disable-line no-unused-vars
            spriteLibraryProps,
            spriteSelectorProps,
            stageProps,
            stopAllProps,
            headerBarProps,
            setupModalProps,
            editorTabsProps,
            arduinoPanelProps,
            vm,
            kb,
            ...guiProps
        } = this.props;
        backdropLibraryProps = defaultsDeep({}, backdropLibraryProps, {
            mediaLibrary: this.mediaLibrary,
            onRequestClose: this.closeModal,
            visible: this.state.currentModal === 'backdrop-library'
        });
        blocksProps = defaultsDeep({}, blocksProps, {
            options: {
                media: `${basePath}static/blocks-media/`
            },
            showStage: this.state.showStage
        });
        costumeLibraryProps = defaultsDeep({}, costumeLibraryProps, {
            mediaLibrary: this.mediaLibrary,
            onRequestClose: this.closeModal,
            visible: this.state.currentModal === 'costume-library'
        });
        spriteLibraryProps = defaultsDeep({}, spriteLibraryProps, {
            mediaLibrary: this.mediaLibrary,
            onRequestClose: this.closeModal,
            visible: this.state.currentModal === 'sprite-library'
        });
        spriteSelectorProps = defaultsDeep({}, spriteSelectorProps, {
            windowHeight: this.state.windowHeight,
            openNewBackdrop: () => this.openModal('backdrop-library'),
            openNewCostume: () => this.openModal('costume-library'),
            openNewSprite: () => this.openModal('sprite-library'),
            selectTarget: (e)=>this.selectTarget(e),
        });
        setupModalProps = defaultsDeep({},setupModalProps, {
            visible: this.state.currentModal === 'setup-modal',
            onRequestClose: this.closeModal,
            language: this.state.language,
            selectLanguage: this.selectLanguage,
            applyconfig: this.applyConfig,
            pluginlist: this.state.pluginlist,
            updater: this.state.updater,
            updateProgress: this.state.updateProgress,
            selectPlugin: (plugin)=>this.selectPlugin(plugin),
            updateKittenblock: ()=>this.updateKittenblock(),
        });
        headerBarProps = defaultsDeep({},headerBarProps,{
            toggleIpopconPanel: ()=>this.toggleIpopconPanel(),
            toggleStage: ()=>this.toggelStage(),
            openSetupModal: ()=>this.openModal("setup-modal"),
            portReadLine: (line)=>this.portReadLine(line),
            openLoadProjectDialog:()=>this.openLoadProjectDialog(),
            openSaveProjectDialog:()=>this.openSaveProjectDialog(),
            projectName: this.state.projectName,
            changeTitle: (t)=>this.changeTitle(t)
        });
        arduinoPanelProps = defaultsDeep({}, arduinoPanelProps, {
            visible: this.state.showArduinoPanel,
            code: this.state.editorCode,
            consoleMsg: this.state.consoleMsg,
            codeUpdate: this.updateEditorInstance,
            firmwares:this.state.firmwares,
            windowHeight: this.state.windowHeight,
            restoreFirmware: (f)=>this.restoreFirmware(f),
            openIno: ()=>this.openIno(),
            uploadProj: ()=>this.uploadProject(),
            consoleSend: (txt)=>this.consoleSend(txt),
            consoleClear: ()=>this.consoleClear(),
            translateCode: ()=>this.translateCode()
        });
        editorTabsProps = defaultsDeep({},editorTabsProps,{
            showStage: this.state.showStage
        });
        if (this.props.children) {
            return (
                <GUIComponent {... guiProps}>
                    {this.props.children}
                </GUIComponent>
            );
        }
        /* eslint-disable react/jsx-max-props-per-line, lines-around-comment */
        return (
            <GUIComponent {... guiProps}>
                <GreenFlag vm={vm} {...greenFlagProps} />
                <StopAll vm={vm} stopProject={this.stopProject} {...stopAllProps} />
                <Stage vm={vm} {...stageProps} />
                <SpriteSelector vm={vm} kb={kb} {... spriteSelectorProps} />
                <Blocks ref="Blocks" vm={vm} kb={kb} {... blocksProps} />
                <SpriteLibrary vm={vm} kb={kb} {...spriteLibraryProps} />
                <CostumeLibrary vm={vm} {...costumeLibraryProps} />
                <BackdropLibrary vm={vm} {...backdropLibraryProps} />
                <HeaderBar kb={kb} {...headerBarProps} />
                <EditorTabs vm={vm} {...editorTabsProps} />
                <ArduinoPanel vm={vm} {...arduinoPanelProps} />
                <SetupModal kb={kb} {...setupModalProps}/>
                <input type="file" style={{display:'none'}} ref={(ref) => this.loadProjDialog = ref} onChange={this.loadProject} accept=".sb2,.kb"/>
                <input type="file" style={{display:'none'}} ref={(ref) => this.saveProjDialog = ref} onChange={this.saveProject} accept=".kb"/>
                <AlertList
                    position='top-left'
                    alerts={this.state.alerts}
                    timeout={this.state.alertTimeout}
                    onDismiss={this.onAlertDismissed.bind(this)}
                />
            </GUIComponent>
        );
        /* eslint-enable react/jsx-max-props-per-line, lines-around-comment */
    }
}

GUI.propTypes = {
    backdropLibraryProps: shapeFromPropTypes(BackdropLibrary.propTypes, {omit: ['vm']}),
    basePath: React.PropTypes.string,
    blocksProps: shapeFromPropTypes(Blocks.propTypes, {omit: ['vm']}),
    children: React.PropTypes.node,
    costumeLibraryProps: shapeFromPropTypes(CostumeLibrary.propTypes, {omit: ['vm']}),
    greenFlagProps: shapeFromPropTypes(GreenFlag.propTypes, {omit: ['vm']}),
    projectData: React.PropTypes.string,
    spriteLibraryProps: shapeFromPropTypes(SpriteLibrary.propTypes, {omit: ['vm']}),
    spriteSelectorProps: shapeFromPropTypes(SpriteSelector.propTypes, {omit: ['vm']}),
    stageProps: shapeFromPropTypes(Stage.propTypes, {omit: ['vm']}),
    stopAllProps: shapeFromPropTypes(StopAll.propTypes, {omit: ['vm']}),
    vm: React.PropTypes.instanceOf(VM),
    kb: React.PropTypes.instanceOf(KittenBlock),
};

GUI.defaultProps = {
    backdropLibraryProps: {},
    basePath: '/',
    blocksProps: {},
    costumeLibraryProps: {},
    greenFlagProps: {},
    spriteSelectorProps: {},
    spriteLibraryProps: {},
    setupModalProps: {},
    stageProps: {},
    stopAllProps: {},
    arduinoPanelProps: {},
    headerBarProps: {},
    editorTabsProps: {},
    vm: new VM(),
    kb: new  KittenBlock()
};

module.exports = GUI;
/*
module.exports = {
  GUI : GUI,
  Ipopcon_device : Ipopcon_device
};
*/
