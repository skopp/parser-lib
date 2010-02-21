/*
 * CSS token information based on Flex lexical scanner grammar:
 * http://www.w3.org/TR/CSS2/grammar.html#scanner
 */    
function CSSParser(handler){

    this._handler = handler || {};
    this._tokenStream = null;
}

CSSParser.prototype = {
    constructor: CSSParser,


    _stylesheet: function(){
    
        /*
         * stylesheet
         *   : [ CHARSET_SYM STRING ';' ]?
         *     [ import ]*
         *     [ [ ruleset | media | page ] ]*
         */ 
       
        var handler     = this._handler,
            tokenStream = this._tokenStream,
            charset     = null,
            tt;
            
        this._callHandler("startDocument");
    
        //try to read character set
        if (tokenStream.match(CSSTokens.CHARSET_SYM)){
            tokenStream.mustMatch(CSSTokens.STRING);
            charset = tokenStream.token().value;
            tokenStream.mustMatch(CSSTokens.SEMICOLON);
            this._callHandler("charset", [charset]);
        }
        
        //try to read imports - may be more than one
        while (tokenStream.peek() == CSSTokens.IMPORT_SYM){
            this._import();
        }
        
        //get the next token
        tt = tokenStream.get();
        
        //try to read the rest
        while(tt > CSSTokens.EOF){
        
            switch(tt){
                case CSSTokens.MEDIA_SYM:
                    tokenStream.unget();
                    this._media();
                    break;
                case CSSTokens.PAGE_SYM:
                    tokenStream.unget();
                    this._page(); 
                    break;                   
                default:
                    tokenStream.unget();
                    this._ruleset();
            }
            
            tt = tokenStream.get();
        }
        
        if (tt != CSSTokens.EOF){
            throw new Error("Unexpected token '" + this._tokenStream.token().value + "'");
        }
    
        this._callHandler("endDocument");
    },
    
    _import: function(){
        /*
         * import
         *   : IMPORT_SYM S*
         *    [STRING|URI] S* media_list? ';' S*
         */    
    
        var tokenStream = this._tokenStream,
            tt,
            uri,
            mediaList   = [];
        
        //read import symbol
        tokenStream.mustMatch(CSSTokens.IMPORT_SYM);
        
        //next must be either a string or URI
        if (!tokenStream.match(CSSTokens.STRING)){
            tokenStream.mustMatch(CSSTokens.URI);
        }
        
        //grab the URI
        uri = tokenStream.token().value;
        
        //check for media information
        if (tokenStream.peek() == CSSTokens.IDENT){
            mediaList = this._media_list();
        }
        
        //must end with a semicolon
        tokenStream.mustMatch(CSSTokens.SEMICOLON);
        
        this._callHandler("importStyle", [uri, mediaList]);

    },
    
    _media: function(){
        /*
         * media
         *   : MEDIA_SYM S* media_list LBRACE S* ruleset* '}' S*
         *   ;
         */
        var tokenStream     = this._tokenStream,
            mediaList       = [];
        
        //look for @media
        tokenStream.mustMatch(CSSTokens.MEDIA_SYM);

        //read the medialist
        mediaList = this._media_list();
 
        tokenStream.mustMatch(CSSTokens.LBRACE);
        
        //TODO: Lookahead for ruleset
        
        tokenStream.mustMatch(CSSTokens.RBRACE);

    },    

    _media_list: function(){
        /*         
         * media_list
         *   : medium [ COMMA S* medium]*
         *   ;
         */    
    
        var tokenStream     = this._tokenStream,
            mediaList       = [];
   
        //must be at least one
        mediaList.push(this._medium());
   
        //check for more
        while (tokenStream.match(CSSTokens.COMMA)){
            mediaList.push(this._medium());
        }

        return mediaList;
    
    },
    
    _medium: function(){
        /*
         * medium
         *   : IDENT S*
         */        
        var tokenStream = this._tokenStream;
        tokenStream.mustMatch(CSSTokens.IDENT);
        return tokenStream.token().value;
    },

    _ruleset: function(){
    
    
    },
    
    
    _callHandler: function(name, args){
        var handler = this._handler;
        
        if (handler[name]){
            handler[name].apply(handler, args || []);
        }
    },
    
    
    
    
    parse: function(input){    
        this._tokenStream = new TokenStream(input, CSSTokens);
        this._stylesheet();
    }
};