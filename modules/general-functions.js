module.exports = (client) => {
  client.stringClean = (string, options={}) => {   // removeAccents: true, removeBrackets:true, trim: true, lowerCase: true, removePunctuation: true
    var editedString = string
    if(options.lowerCase == undefined || options.lowerCase){
      editedString = editedString.toLowerCase()
    }
    if(options.removePunctuation == undefined || options.removePunctuation){
      editedString = editedString.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ")
    }
    if(options.removeAccents == undefined || options.removeAccents){
      editedString = editedString.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    }
    // if(options.removeBrackets == undefined || options.removeBrackets){
    //   editedString = editedString.replace(/\[|\]|\)|\(|\,|\'/g, '')
    // }
    if(options.trim == undefined || options.trim){
      editedString = editedString.trim()
    }


    return editedString
  }

}
