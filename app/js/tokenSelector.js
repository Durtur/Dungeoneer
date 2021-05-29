class TokenSelector{

    async getNewTokenPaths(multiSelect = true){
        var props = ['openFile'];
        if(multiSelect)
            props.push("multiSelections");
        var imagePaths = dialog.showOpenDialogSync(remote.getCurrentWindow(), {
            properties: props,
            message: "Choose picture location",
            filters: [{ name: 'Images', extensions: ['png'] }]
          });
        
          if (!imagePaths) return null;
          return imagePaths;
    }

}

module.exports = TokenSelector;