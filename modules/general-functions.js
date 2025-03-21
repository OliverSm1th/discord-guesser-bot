module.exports = (client) => {
  client.stringClean = (string, options={}) => {   // removeAccents: true, removeBrackets:true, trim: true, lowerCase: true, removePunctuation: true, pickLargestPart: true, multipleOptions: false
    var editedString = string
    if(options.lowerCase == undefined || options.lowerCase){
      editedString = editedString.toLowerCase()
    }
    if(options.removePunctuation == undefined || options.removePunctuation){
      editedString = editedString.replace(/[.,#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ")
    }
    if(options.removeAccents == undefined || options.removeAccents){
      editedString = editedString.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    }
    if(options.multipleOptions == true) {
      let parts = editedString.split("/");
      parts.sort((a,b) => b.length-a.length)
      if(options.trim == undefined || options.trim){
        parts = parts.map(part => part.trim());
      }
      console.log(parts)
      return parts
    }
    else if(options.pickLargestPart == undefined || options.pickLargestPart) {  // For multiple parts separated by /, pick the largest one
      const parts = editedString.split("/");
      editedString = parts.sort((a,b) => b.length-a.length)[0];
    } else {
      editedString = editedString.replace("/", "");
    }
    if(options.trim == undefined || options.trim){
      editedString = editedString.trim()
    }


    return editedString
  }
  

}